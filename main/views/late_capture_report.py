"""Late-capture reporting.

Policy: an inspection must be captured in APS within LATE_CAPTURE_LAG_DAYS
days of the inspection date. Anything captured after that window is a late
submission and is surfaced here per inspector so management can follow up.
"""
import datetime

from django.db.models import Count, F, Q
from django.db.models.functions import TruncMonth
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from ..models import InspectionGroup
from ..permissions import require_capability

# Allowed capture window: inspection date + this many days. Captured later = late.
LATE_CAPTURE_LAG_DAYS = 2


def late_capture_q():
    """Q object matching groups captured outside the allowed lag window."""
    return Q(created_at__date__gt=F('date_of_inspection')
             + datetime.timedelta(days=LATE_CAPTURE_LAG_DAYS))


@csrf_exempt
@login_required
@require_capability('view_late_capture_report')
def api_late_capture_report(request):
    """
    GET ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD[&inspector=Name]

    Returns per-inspector late-capture stats plus the individual late
    inspections, based on capture date (created_at) vs inspection date.
    Defaults to the last 90 days when no range is given.
    """
    today = datetime.date.today()
    date_from = request.GET.get('date_from') or (today - datetime.timedelta(days=90)).isoformat()
    date_to = request.GET.get('date_to') or today.isoformat()

    base_qs = InspectionGroup.objects.filter(
        date_of_inspection__gte=date_from,
        date_of_inspection__lte=date_to,
        date_of_inspection__isnull=False,
        created_at__isnull=False,
    )
    inspector = request.GET.get('inspector')
    if inspector:
        base_qs = base_qs.filter(inspector_name__iexact=inspector)
    client_search = request.GET.get('client_search', '').strip()
    if client_search:
        base_qs = base_qs.filter(client_name__icontains=client_search)
    try:
        min_days = int(request.GET.get('min_days_late') or 0)
    except ValueError:
        min_days = 0
    # late = outside the lag window AND (optionally) at least min_days late
    _threshold = max(LATE_CAPTURE_LAG_DAYS, min_days - 1)
    _late_q = Q(created_at__date__gt=F('date_of_inspection') + datetime.timedelta(days=_threshold))

    # Totals per inspector (all captures in range, for the late percentage)
    totals = {}
    for name in base_qs.values_list('inspector_name', flat=True):
        key = name or '—'
        totals[key] = totals.get(key, 0) + 1

    late_entries = []
    per_inspector = {}
    late_qs = base_qs.filter(_late_q).select_related(None).order_by('-created_at')
    for g in late_qs.only('id', 'client_name', 'inspector_name',
                          'date_of_inspection', 'created_at', 'created_by_name')[:1000]:
        days_late = (g.created_at.date() - g.date_of_inspection).days
        key = g.inspector_name or '—'
        e = per_inspector.setdefault(key, {'count': 0, 'total_days': 0, 'max_days': 0})
        e['count'] += 1
        e['total_days'] += days_late
        e['max_days'] = max(e['max_days'], days_late)
        late_entries.append({
            'group_id': g.id,
            'client_name': g.client_name or '',
            'inspector_name': key,
            # Who actually entered it into APS. Empty for rows created before
            # capture tracking existed (the UI falls back to the inspector).
            'captured_by': g.created_by_name or '',
            'date_of_inspection': g.date_of_inspection.isoformat(),
            'captured_at': g.created_at.isoformat(),
            'days_late': days_late,
        })

    inspectors = sorted(
        [{
            'inspector_name': name,
            'total_inspections': totals.get(name, stats['count']),
            'late_count': stats['count'],
            'late_pct': round(stats['count'] / totals[name] * 100, 1) if totals.get(name) else None,
            'avg_days_late': round(stats['total_days'] / stats['count'], 1),
            'max_days_late': stats['max_days'],
        } for name, stats in per_inspector.items()],
        key=lambda x: (-x['late_count'], x['inspector_name']),
    )

    # Monthly comparison: on-time vs late captures, binned by inspection month
    # (same axis the page's date filters use)
    month_map = {}
    for row in (base_qs.annotate(m=TruncMonth('date_of_inspection'))
                .values('m').annotate(n=Count('id')).order_by('m')):
        key = row['m'].strftime('%Y-%m')
        month_map[key] = {'month': key, 'total': row['n'], 'late': 0}
    for row in (base_qs.filter(_late_q).annotate(m=TruncMonth('date_of_inspection'))
                .values('m').annotate(n=Count('id')).order_by('m')):
        key = row['m'].strftime('%Y-%m')
        month_map.setdefault(key, {'month': key, 'total': 0, 'late': 0})['late'] = row['n']
    monthly = sorted(month_map.values(), key=lambda x: x['month'])

    return JsonResponse({
        'success': True,
        'lag_days': LATE_CAPTURE_LAG_DAYS,
        'date_from': date_from,
        'date_to': date_to,
        'total_in_range': sum(totals.values()),
        'total_late': len(late_entries),
        'inspectors': inspectors,
        'late_entries': late_entries,
        'monthly': monthly,
    })
