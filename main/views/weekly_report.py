"""Weekly Inspectorate Performance Report.

Management report requested by the APS Department: previous completed week
(Monday 00:00 - Sunday 23:59), per inspector, every table ranked highest to
lowest with the ranking basis stated. Reuses the existing data sources:
QuarterlyTarget for targets, is_product_compliant for compliance (measured
over ALL of the inspector's records — every commodity counts, and a record
with no recorded outcome cannot count as compliant), capture/approval
timestamps for administration tracking, and InspectionGroup hours/km for
travel.

Deliberately contains NO financial data (no revenue, salaries, costs or
rates) — the exclusion is enforced here in the queries, not in the UI.
"""
import datetime

from django.db.models import Count, F, Q, Sum
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import (
    Client,
    FoodSafetyAgencyInspection,
    InspectionDocument,
    InspectionGroup,
    QuarterlyTarget,
)
from ..services.kpi_email_service import get_quarter_bounds

# An inspection must be captured/approved within this many days (site standard)
ADMIN_LAG_DAYS = 2
# A sample without a COA result older than this is overdue at the lab
SAMPLE_OVERDUE_DAYS = 7

VIEW_ROLES = ('super_admin', 'developer', 'admin', 'inspector_manager', 'inspector')


# Expected turnaround per stage, in days. Approval and COA reuse the standards
# already applied elsewhere in this report; doc-send and invoice are a starting
# point for the APS department to confirm.
TURNAROUND_TARGETS = {'send_docs': 3, 'invoice': 5, 'sample_to_coa': 7, 'approval': ADMIN_LAG_DAYS}

TURNAROUND_LABELS = {
    'send_docs': 'Inspection to documents sent',
    'invoice': 'Documents sent to invoice',
    'sample_to_coa': 'Sample to COA uploaded',
    'approval': 'Captured to approved',
}


def _as_date(value):
    return value.date() if isinstance(value, datetime.datetime) else value


def _turnaround(start, end):
    """Average days for each back-office stage over inspections in [start, end].

    Requested 2026-08-06: managers were seeing volumes but not how long work
    sits between inspection, document dispatch, invoicing, COA and approval —
    so bottlenecks and the department responsible were invisible.

    Reads invoice TIMING only. No amount, rate or revenue column is selected,
    keeping this report free of financial data like the rest of the file.
    """
    groups = list(
        InspectionGroup.objects
        .filter(date_of_inspection__gte=start, date_of_inspection__lte=end)
        .values('id', 'date_of_inspection')
    )
    if not groups:
        return {k: {'avg': None, 'count': 0} for k in TURNAROUND_TARGETS}
    gids = [g['id'] for g in groups]
    gdate = {g['id']: g['date_of_inspection'] for g in groups}

    state = {}
    for r in FoodSafetyAgencyInspection.objects.filter(
        inspection_group_id__in=gids
    ).values('inspection_group_id', 'approved_status', 'approved_date',
             'sent_date', 'is_sample_taken', 'created_at'):
        s = state.setdefault(r['inspection_group_id'],
                             {'approved': None, 'sent': None, 'sampled': False, 'captured': None})
        if r['approved_status'] == 'APPROVED' and r['approved_date']:
            if s['approved'] is None or r['approved_date'] < s['approved']:
                s['approved'] = r['approved_date']
        if r['sent_date'] and (s['sent'] is None or r['sent_date'] < s['sent']):
            s['sent'] = r['sent_date']
        if r['is_sample_taken']:
            s['sampled'] = True
        if r['created_at'] and (s['captured'] is None or r['created_at'] < s['captured']):
            s['captured'] = r['created_at']

    docs = {}
    for r in InspectionDocument.objects.filter(
        inspection__inspection_group_id__in=gids, document_type__in=['invoice', 'coa'],
    ).values('inspection__inspection_group_id', 'document_type', 'uploaded_date'):
        gid, key = r['inspection__inspection_group_id'], r['document_type']
        cur = docs.setdefault(gid, {}).get(key)
        if cur is None or r['uploaded_date'] < cur:
            docs[gid][key] = r['uploaded_date']

    buckets = {k: [] for k in TURNAROUND_TARGETS}
    for gid, inspected in gdate.items():
        s, d = state.get(gid, {}), docs.get(gid, {})
        pairs = {
            'send_docs': (inspected, s.get('sent')),
            'invoice': (s.get('sent'), d.get('invoice')),
            'sample_to_coa': (inspected, d.get('coa')) if s.get('sampled') else (None, None),
            'approval': (s.get('captured'), s.get('approved')),
        }
        for key, (a, b) in pairs.items():
            a, b = _as_date(a), _as_date(b)
            if a and b and (b - a).days >= 0:
                buckets[key].append((b - a).days)

    return {
        key: {
            'avg': round(sum(v) / len(v), 1) if v else None,
            'count': len(v),
        }
        for key, v in buckets.items()
    }


def _non_inspector_names():
    """Names belonging to non-inspector users plus known junk entries."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    names = {'', 'Unknown', 'API User'}
    for u in User.objects.exclude(role__in=['inspector', 'inspector_manager']):
        if u.first_name:
            names.add(u.first_name)
        if u.last_name:
            names.add(u.last_name)
        full = f"{u.first_name} {u.last_name}".strip()
        if full:
            names.add(full)
        if u.username:
            names.add(u.username)
    return names


def _monday(d):
    return d - datetime.timedelta(days=d.weekday())


def _parse_range(request):
    """?date_from=&date_to= (any range). Default: the previous completed
    Monday–Sunday week, per the report specification."""
    def _d(name):
        raw = (request.GET.get(name) or '').strip()
        try:
            return datetime.date.fromisoformat(raw) if raw else None
        except ValueError:
            return None

    date_from, date_to = _d('date_from'), _d('date_to')
    if date_from and date_to and date_from <= date_to:
        return date_from, date_to
    week_start = _monday(datetime.date.today()) - datetime.timedelta(days=7)
    return week_start, week_start + datetime.timedelta(days=6)


def _week_qs(week_start, week_end, excl):
    return FoodSafetyAgencyInspection.objects.filter(
        date_of_inspection__gte=week_start, date_of_inspection__lte=week_end,
    ).exclude(Q(inspector_name__isnull=True) | Q(inspector_name='') | Q(inspector_name__in=excl))


def _per_inspector(week_start, week_end, excl):
    overdue_cutoff = datetime.date.today() - datetime.timedelta(days=SAMPLE_OVERDUE_DAYS)
    rows = _week_qs(week_start, week_end, excl).values('inspector_name').annotate(
        inspections=Count('id'),
        compliant=Count('id', filter=Q(is_product_compliant=True)),
        non_compliant=Count('id', filter=Q(is_product_compliant=False)),
        approved=Count('id', filter=Q(approved_status='APPROVED')),
        pending=Count('id', filter=~Q(approved_status='APPROVED')),
        occurrences=Count('id', filter=Q(is_occurrence_report=True)),
        samples=Count('id', filter=Q(is_sample_taken=True)),
        samples_completed=Count('id', filter=Q(is_sample_taken=True, coa_uploaded_date__isnull=False)),
        samples_overdue=Count('id', filter=Q(
            is_sample_taken=True, coa_uploaded_date__isnull=True,
            date_of_inspection__lt=overdue_cutoff,
        )),
        captured_on_time=Count('id', filter=Q(
            created_at__isnull=False,
            created_at__date__lte=F('date_of_inspection') + datetime.timedelta(days=ADMIN_LAG_DAYS),
        )),
    )
    return {r['inspector_name']: r for r in rows}


def _rank_map(stats, key):
    """name -> rank (1 = highest) ranked by `key` descending."""
    ordered = sorted(stats.values(), key=lambda r: (-r.get(key, 0), r['inspector_name'].lower()))
    return {r['inspector_name']: i + 1 for i, r in enumerate(ordered)}


@csrf_exempt
def api_weekly_report(request):
    # Server-to-server access for the automatic Monday email (PDF generation).
    from django.conf import settings as dj_settings
    internal_key = getattr(dj_settings, 'WEEKLY_INTERNAL_KEY', '')
    if internal_key and request.headers.get('X-Internal-Key') == internal_key:
        pass
    elif not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    elif getattr(request.user, 'role', '') not in VIEW_ROLES:
        return JsonResponse({'success': False, 'error': 'Not authorised'}, status=403)

    excl = _non_inspector_names()
    week_start, week_end = _parse_range(request)
    # Previous period = the same number of days immediately before the range
    period_days = (week_end - week_start).days + 1
    prev_end = week_start - datetime.timedelta(days=1)
    prev_start = prev_end - datetime.timedelta(days=period_days - 1)
    today = datetime.date.today()

    cur = _per_inspector(week_start, week_end, excl)
    prev = _per_inspector(prev_start, prev_end, excl)

    # ── 1. Inspection performance (rank basis: weekly inspections completed) ──
    quarter, year, q_start, q_end, _pct = get_quarter_bounds(week_end)
    cum_rows = FoodSafetyAgencyInspection.objects.filter(
        date_of_inspection__gte=q_start, date_of_inspection__lte=week_end,
    ).exclude(Q(inspector_name__isnull=True) | Q(inspector_name='') | Q(inspector_name__in=excl)
    ).values('inspector_name').annotate(
        n=Count('id'),
        a=Count('id', filter=Q(approved_status='APPROVED')),
    )
    cumulative = {r['inspector_name']: r for r in cum_rows}

    targets = {}
    for t in QuarterlyTarget.objects.filter(year=year, quarter=quarter):
        targets[t.inspector_name] = (t.poultry or 0) + (t.raw or 0) + (t.pmp or 0) + (t.eggs or 0)

    cur_rank = _rank_map(cur, 'inspections')
    prev_rank = _rank_map(prev, 'inspections')
    performance = []
    for name, r in cur.items():
        # Case-insensitive target lookup (target names are typed by hand)
        target = targets.get(name) or next(
            (v for k, v in targets.items() if k.lower() == name.lower()), 0)
        cum_r = cumulative.get(name, {})
        cum = cum_r.get('n', 0)
        cum_approved = cum_r.get('a', 0)
        performance.append({
            'inspector_name': name,
            'quarter_target': target,
            'weekly_inspections': r['inspections'],
            'prev_inspections': prev.get(name, {}).get('inspections', 0),
            'cumulative_inspections': cum,
            'cumulative_approved': cum_approved,
            'cumulative_pending': cum - cum_approved,
            'target_pct': round(cum * 100 / target) if target else None,
            'rank': cur_rank[name],
            'rank_change': (prev_rank.get(name) - cur_rank[name]) if name in prev_rank else None,
        })
    performance.sort(key=lambda x: x['rank'])

    # 8-week inspectorate trend (total inspections per week)
    trend_weeks = []
    for i in range(7, -1, -1):
        ws = week_start - datetime.timedelta(days=7 * i)
        we = ws + datetime.timedelta(days=6)
        trend_weeks.append({
            'week': ws.isoformat(),
            'inspections': _week_qs(ws, we, excl).count(),
        })

    # ── 2. Sample tracking (rank basis: samples taken this week) ──
    # Every inspector is listed — including those whose inspections had NO
    # sample taken, because that is exactly what management wants to see.
    sample_rank = _rank_map(cur, 'samples')
    samples = []
    for name, r in sorted(cur.items(), key=lambda kv: sample_rank[kv[0]]):
        outstanding = r['samples'] - r['samples_completed']
        samples.append({
            'inspector_name': name,
            'inspections': r['inspections'],
            'taken': r['samples'],
            'no_sample': r['inspections'] - r['samples'],
            'completed': r['samples_completed'],
            'waiting': outstanding - r['samples_overdue'],
            'overdue': r['samples_overdue'],
            'outstanding': outstanding,
            'rank': sample_rank[name],
        })

    outstanding_detail = []
    overdue_count = 0
    for s in _week_qs(week_start, week_end, excl).filter(
        is_sample_taken=True, coa_uploaded_date__isnull=True,
    ).values('inspector_name', 'client_name', 'date_of_inspection', 'commodity').order_by('date_of_inspection'):
        age = (today - s['date_of_inspection']).days
        overdue = age > SAMPLE_OVERDUE_DAYS
        if overdue:
            overdue_count += 1
        outstanding_detail.append({
            'inspector_name': s['inspector_name'],
            'client_name': s['client_name'] or '',
            'commodity': s['commodity'] or '',
            'sample_date': s['date_of_inspection'].isoformat(),
            'age_days': age,
            'overdue': overdue,
        })

    total_samples = sum(r['samples'] for r in cur.values())
    total_completed = sum(r['samples_completed'] for r in cur.values())
    sample_status = {
        'completed': total_completed,
        'waiting': total_samples - total_completed - overdue_count,
        'overdue': overdue_count,
    }

    # ── 3. Approval versus capturing (rank basis: approval rate) ──
    approvals = []
    for name, r in cur.items():
        total = r['inspections']
        approvals.append({
            'inspector_name': name,
            'total_records': total,
            'captured_on_time': r['captured_on_time'],
            'approved': r['approved'],
            'pending': r['pending'],
            'approval_rate': round(r['approved'] * 100 / total) if total else 0,
            'capture_rate': round(r['captured_on_time'] * 100 / total) if total else 0,
        })
    approvals.sort(key=lambda x: (-x['approval_rate'], -x['total_records'], x['inspector_name'].lower()))
    for i, row in enumerate(approvals):
        row['rank'] = i + 1

    # ── 4. Occurrence reports (rank basis: occurrence reports this week) ──
    occ_rank = _rank_map(cur, 'occurrences')
    occurrences = [
        {'inspector_name': name, 'count': r['occurrences'], 'rank': occ_rank[name]}
        for name, r in sorted(cur.items(), key=lambda kv: occ_rank[kv[0]])
        if r['occurrences'] > 0
    ]
    occurrence_detail = list(_week_qs(week_start, week_end, excl).filter(
        is_occurrence_report=True,
    ).values('inspector_name', 'client_name', 'town', 'approved_status', 'date_of_inspection', 'created_at'
    ).order_by('inspector_name', 'date_of_inspection'))
    for o in occurrence_detail:
        o['date_of_inspection'] = o['date_of_inspection'].isoformat() if o['date_of_inspection'] else None
        o['submitted'] = o.pop('created_at').date().isoformat() if o['created_at'] else None
        o['status'] = 'Approved' if o.pop('approved_status') == 'APPROVED' else 'Pending'

    # ── 5. Weekly compliance (rank basis: compliance rate over ALL of the
    # inspector's records this week — every commodity counts; a record with no
    # recorded outcome cannot count as compliant, so it pulls the rate down) ──
    # Compliance per commodity (POULTRY block, EGGS block, ...) — each block
    # carries the per-inspector breakdown for that commodity.
    comm_agg = {}
    for row in _week_qs(week_start, week_end, excl).values('commodity', 'inspector_name').annotate(
        n=Count('id'),
        c=Count('id', filter=Q(is_product_compliant=True)),
        nc=Count('id', filter=Q(is_product_compliant=False)),
    ):
        if not (row['commodity'] or '').strip():
            continue  # occurrence reports carry no commodity — not a commodity block
        key = row['commodity'].strip().upper()
        agg = comm_agg.setdefault(key, {'n': 0, 'c': 0, 'nc': 0, 'by_inspector': {}})
        agg['n'] += row['n']
        agg['c'] += row['c']
        agg['nc'] += row['nc']
        person = agg['by_inspector'].setdefault(row['inspector_name'], {'n': 0, 'c': 0, 'nc': 0})
        person['n'] += row['n']
        person['c'] += row['c']
        person['nc'] += row['nc']
    commodity_compliance = [
        {
            'commodity': key,
            'inspections': a['n'],
            'compliant': a['c'],
            'non_compliant': a['nc'],
            'not_assessed': a['n'] - a['c'] - a['nc'],
            'rate': round(a['c'] * 100 / a['n'], 1) if a['n'] else 0,
            'inspectors': sorted(
                [
                    {
                        'inspector_name': name,
                        'inspections': p['n'],
                        'compliant': p['c'],
                        'non_compliant': p['nc'],
                        'not_assessed': p['n'] - p['c'] - p['nc'],
                        'rate': round(p['c'] * 100 / p['n'], 1) if p['n'] else 0,
                    }
                    for name, p in a['by_inspector'].items()
                ],
                key=lambda x: (-x['rate'], -x['inspections'], x['inspector_name'].lower()),
            ),
        }
        for key, a in sorted(comm_agg.items(), key=lambda kv: -kv[1]['n'])
    ]

    compliance = []
    for name, r in cur.items():
        total = r['inspections']
        if total == 0:
            continue
        prev_r = prev.get(name)
        prev_total = prev_r['inspections'] if prev_r else 0
        # Exact rate to one decimal (91.2 style) — no coarse rounding
        prev_rate = round(prev_r['compliant'] * 100 / prev_total, 1) if prev_total else None
        rate = round(r['compliant'] * 100 / total, 1)
        compliance.append({
            'inspector_name': name,
            'inspections': total,
            'compliant': r['compliant'],
            'non_compliant': r['non_compliant'],
            'not_assessed': total - r['compliant'] - r['non_compliant'],
            'rate': rate,
            'prev_rate': prev_rate,
            'change': round(rate - prev_rate, 1) if prev_rate is not None else None,
        })
    compliance.sort(key=lambda x: (-x['rate'], -x['inspections'], x['inspector_name'].lower()))
    for i, row in enumerate(compliance):
        row['rank'] = i + 1

    def _overall_rate(stats):
        c = sum(r['compliant'] for r in stats.values())
        n = sum(r['inspections'] for r in stats.values())
        return round(c * 100 / n, 1) if n else None

    overall_rate = _overall_rate(cur)
    prev_overall_rate = _overall_rate(prev)

    compliance_trend = []
    for i in range(7, -1, -1):
        ws = week_start - datetime.timedelta(days=7 * i)
        we = ws + datetime.timedelta(days=6)
        agg = _week_qs(ws, we, excl).aggregate(
            c=Count('id', filter=Q(is_product_compliant=True)),
            n=Count('id'),
        )
        compliance_trend.append({
            'week': ws.isoformat(),
            'rate': round(agg['c'] * 100 / agg['n'], 1) if agg['n'] else None,
        })

    # ── 6. Travel activity (rank basis: kilometres travelled) ──
    grp_excl = Q(inspector_name__isnull=True) | Q(inspector_name='') | Q(inspector_name__in=excl)
    travel_rows = InspectionGroup.objects.filter(
        date_of_inspection__gte=week_start, date_of_inspection__lte=week_end,
    ).exclude(grp_excl).values('inspector_name').annotate(
        km=Sum('km_traveled'), hours=Sum('hours'),
    )
    # Facilities first captured by each inspector this week (Clients Approval feature)
    new_fac_rows = Client.objects.filter(
        created_at__date__gte=week_start, created_at__date__lte=week_end,
        created_by__isnull=False,
    ).values('created_by__first_name', 'created_by__last_name').annotate(n=Count('id'))
    new_facilities = {}
    for r in new_fac_rows:
        full = f"{r['created_by__first_name']} {r['created_by__last_name']}".strip()
        new_facilities[full.lower()] = r['n']

    travel = []
    for r in travel_rows:
        name = r['inspector_name']
        km = float(r['km'] or 0)
        hours = float(r['hours'] or 0)
        insp = cur.get(name, {}).get('inspections', 0)
        if km == 0 and hours == 0 and insp == 0:
            continue
        travel.append({
            'inspector_name': name,
            'km': round(km, 1),
            'hours': round(hours, 1),
            'inspections': insp,
            'avg_km_per_inspection': round(km / insp, 1) if insp else 0,
            'new_facilities': new_facilities.get(name.lower(), 0),
        })
    travel.sort(key=lambda x: (-x['km'], x['inspector_name'].lower()))
    for i, row in enumerate(travel):
        row['rank'] = i + 1

    # Optional deep-dive for ONE inspector (used by the personal report):
    # their actual inspection records for the period, plus per-day counts.
    inspector_detail = None
    insp_name = (request.GET.get('inspector') or '').strip()
    if insp_name:
        recs = list(
            _week_qs(week_start, week_end, excl)
            .filter(inspector_name__iexact=insp_name)
            .values(
                'client_name', 'date_of_inspection', 'commodity',
                'is_product_compliant', 'approved_status',
                'is_sample_taken', 'coa_uploaded_date',
            )
            .order_by('date_of_inspection', 'client_name')
        )
        daily_counts = {}
        for r in recs:
            daily_counts[r['date_of_inspection']] = daily_counts.get(r['date_of_inspection'], 0) + 1
        day = week_start
        daily = []
        while day <= week_end:
            daily.append({'date': day.isoformat(), 'count': daily_counts.get(day, 0)})
            day += datetime.timedelta(days=1)
        inspector_detail = {
            'name': insp_name,
            'daily': daily,
            'inspections': [
                {
                    'date': r['date_of_inspection'].isoformat() if r['date_of_inspection'] else None,
                    'client': r['client_name'] or '',
                    'commodity': r['commodity'] or '',
                    'result': ('Pass' if r['is_product_compliant'] else 'Fail')
                              if r['is_product_compliant'] is not None else 'Not recorded',
                    'approved': r['approved_status'] == 'APPROVED',
                    'sample_taken': bool(r['is_sample_taken']),
                    'sample_result_back': bool(r['coa_uploaded_date']),
                }
                for r in recs
            ],
        }

    # Back-office turnaround, this period against the last one, so the report
    # shows whether the delays are shrinking rather than just how big they are.
    _cur_turnaround = _turnaround(week_start, week_end)
    _prev_turnaround = _turnaround(prev_start, prev_end)

    return JsonResponse({
        'success': True,
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'inspector_detail': inspector_detail,
        'is_single_week': period_days == 7 and week_start.weekday() == 0,
        'quarter': f'Q{quarter} {year}',
        'admin_lag_days': ADMIN_LAG_DAYS,
        'sample_overdue_days': SAMPLE_OVERDUE_DAYS,
        'totals': {
            'inspections': sum(r['inspections'] for r in cur.values()),
            'prev_inspections': sum(r['inspections'] for r in prev.values()),
            'active_inspectors': len(cur),
            'samples': total_samples,
            'occurrences': sum(r['occurrences'] for r in cur.values()),
            'approved': sum(r['approved'] for r in cur.values()),
            'pending': sum(r['pending'] for r in cur.values()),
            'overall_compliance': overall_rate,
            'prev_overall_compliance': prev_overall_rate,
            'total_km': round(sum(t['km'] for t in travel), 1),
            'total_hours': round(sum(t['hours'] for t in travel), 1),
        },
        'turnaround': {
            key: {
                **vals,
                'prev_avg': _prev_turnaround[key]['avg'],
                'target': TURNAROUND_TARGETS[key],
                'label': TURNAROUND_LABELS[key],
            }
            for key, vals in _cur_turnaround.items()
        },
        'performance': performance,
        'inspection_trend': trend_weeks,
        'samples': samples,
        'sample_status': sample_status,
        'outstanding_samples': outstanding_detail,
        'approvals': approvals,
        'occurrences': occurrences,
        'occurrence_detail': occurrence_detail,
        'compliance': compliance,
        'commodity_compliance': commodity_compliance,
        'compliance_trend': compliance_trend,
        'travel': travel,
    })
