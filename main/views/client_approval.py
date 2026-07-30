"""Clients Approval workflow.

When a field inspector captures an inspection for a client that doesn't exist
yet, the client record is auto-created with approval_status='pending'
(see api_add_inspection / api_edit_inspection in data_views.py). Back-office
users review those here: the list endpoint surfaces likely duplicates of
existing clients (e.g. "Pick and Pay" typed instead of "Pick n Pay") so the
reviewer can approve the name as-is, fix the spelling, or merge the new
record into the client it duplicates.
"""
import json
import re
from difflib import SequenceMatcher

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import (
    Client, ClientApprovalLog, ClientEmail, FoodSafetyAgencyInspection, InspectionGroup,
)
from ..permissions import require_capability

# Suggestions below this similarity are noise, not likely duplicates.
SIMILARITY_THRESHOLD = 0.55
MAX_SUGGESTIONS = 5


def _norm(name):
    """Normalize a client name for fuzzy comparison."""
    txt = (name or '').lower().strip()
    txt = re.sub(r"[\(\)\[\]{}\\/._,'&-]", " ", txt)
    # Canonicalize the connective so "pick and pay" == "pick n pay"
    txt = re.sub(r"\b(and|en)\b", "n", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def _similar_clients(pending, approved):
    """Top approved clients whose name resembles the pending client's."""
    target = _norm(pending.name)
    scored = []
    for c in approved:
        ratio = SequenceMatcher(None, target, _norm(c['name'])).ratio()
        if ratio >= SIMILARITY_THRESHOLD:
            scored.append((ratio, c))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [
        {
            'id': c['id'],
            'client_id': c['client_id'],
            'name': c['name'],
            'town': c['town'] or '',
            'similarity': round(ratio * 100),
        }
        for ratio, c in scored[:MAX_SUGGESTIONS]
    ]


def _user_label(user):
    if not user:
        return ''
    return (f"{user.first_name} {user.last_name}".strip() or user.username)


def _created_by_label(client):
    return _user_label(client.created_by)


@csrf_exempt
@login_required
@require_capability('manage_clients')
def api_clients_approval(request):
    """GET pending clients awaiting approval.

    ?count_only=1 returns just {'count': N} (used for the nav badge).
    ?search=  filters by client name / creator.
    ?page= & ?page_size=  paginate (default 20 per page) — similarity
    suggestions are only computed for the requested page, so the endpoint
    stays fast even with thousands of clients.
    """
    pending_qs = Client.objects.filter(approval_status='pending')

    if request.GET.get('count_only'):
        return JsonResponse({'success': True, 'count': pending_qs.count()})

    # ?target_search= — look up approved clients by name so the reviewer can
    # assign a pending client's inspections to ANY existing client, not just
    # the fuzzy suggestions.
    target_search = (request.GET.get('target_search') or '').strip()
    if target_search:
        matches = list(
            Client.objects.filter(approval_status='approved', name__icontains=target_search)
            .order_by('name')
            .values('id', 'client_id', 'name', 'town')[:20]
        )
        for m in matches:
            m['town'] = m['town'] or ''
        return JsonResponse({'success': True, 'results': matches})

    search = (request.GET.get('search') or '').strip()
    if search:
        from django.db.models import Q
        pending_qs = pending_qs.filter(
            Q(name__icontains=search)
            | Q(town__icontains=search)
            | Q(created_by__first_name__icontains=search)
            | Q(created_by__last_name__icontains=search)
            | Q(created_by__username__icontains=search)
        )

    total = pending_qs.count()
    try:
        page = max(1, int(request.GET.get('page') or 1))
    except ValueError:
        page = 1
    try:
        page_size = min(100, max(1, int(request.GET.get('page_size') or 20)))
    except ValueError:
        page_size = 20
    offset = (page - 1) * page_size

    approved = list(
        Client.objects.filter(approval_status='approved')
        .values('id', 'client_id', 'name', 'town')
    )

    items = []
    page_qs = pending_qs.select_related('created_by').order_by('-created_at')[offset:offset + page_size]
    for client in page_qs:
        groups = list(
            InspectionGroup.objects.filter(client=client)
            .order_by('-date_of_inspection')
            .values('id', 'date_of_inspection', 'inspector_name')[:10]
        )
        items.append({
            'id': client.id,
            'client_id': client.client_id,
            'name': client.name,
            'town': client.town or '',
            'corporate_group': client.corporate_group or '',
            'group_type': client.group_type or '',
            'facility_type': client.facility_type or '',
            'created_at': client.created_at.isoformat() if client.created_at else None,
            'created_by': _created_by_label(client),
            'inspection_count': InspectionGroup.objects.filter(client=client).count(),
            'recent_groups': [
                {
                    'id': g['id'],
                    'date_of_inspection': g['date_of_inspection'].isoformat() if g['date_of_inspection'] else None,
                    'inspector_name': g['inspector_name'] or '',
                }
                for g in groups
            ],
            'similar': _similar_clients(client, approved),
        })

    return JsonResponse({
        'success': True,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': max(1, -(-total // page_size)),
        'clients': items,
    })


@csrf_exempt
@login_required
@require_capability('manage_clients')
def api_client_approve(request):
    """POST {id, new_name?} — approve a pending client, optionally fixing its name.

    Renaming also updates the denormalized client_name on the client's
    inspection groups and inspections so the Inspections page shows the
    corrected spelling. If the corrected name already belongs to another
    client, the caller should merge instead — we return that client so the
    frontend can offer it.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body or '{}')
        client = Client.objects.filter(id=data.get('id'), approval_status='pending').first()
        if not client:
            return JsonResponse({'success': False, 'error': 'Pending client not found'}, status=404)

        new_name = (data.get('new_name') or '').strip()
        typed_name = client.name
        with transaction.atomic():
            if new_name and new_name.lower() != client.name.lower():
                existing = (
                    Client.objects.filter(name__iexact=new_name)
                    .exclude(id=client.id)
                    .first()
                )
                if existing:
                    return JsonResponse({
                        'success': False,
                        'error': f'A client named "{existing.name}" already exists. Merge into it instead.',
                        'existing_client': {'id': existing.id, 'name': existing.name},
                    })
                client.name = new_name
                InspectionGroup.objects.filter(client=client).update(client_name=new_name)
                FoodSafetyAgencyInspection.objects.filter(client=client).update(client_name=new_name)

            client.approval_status = 'approved'
            client.save()

            ClientApprovalLog.objects.create(
                typed_name=typed_name,
                final_name=client.name,
                outcome='accepted',
                inspector=client.created_by,
                inspector_name=_created_by_label(client),
                decided_by=request.user,
                decided_by_name=_user_label(request.user),
                inspection_count=InspectionGroup.objects.filter(client=client).count(),
                client_created_at=client.created_at,
            )

        # New/renamed client should appear correctly in Add Inspection dropdowns
        from django.core.cache import cache
        cache.delete('add_inspection_form_data')

        return JsonResponse({'success': True, 'message': f'Client "{client.name}" approved.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
@require_capability('manage_clients')
def api_client_merge(request):
    """POST {id, target_id} — merge a pending duplicate into an existing client.

    Everything hanging off the pending client (inspection groups, inspections,
    extra emails, shipments) is re-pointed at the target client and the
    denormalized client_name strings are rewritten to the target's name; the
    pending record is then deleted.
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body or '{}')
        source = Client.objects.filter(id=data.get('id'), approval_status='pending').first()
        if not source:
            return JsonResponse({'success': False, 'error': 'Pending client not found'}, status=404)
        target = Client.objects.filter(id=data.get('target_id')).exclude(id=source.id).first()
        if not target:
            return JsonResponse({'success': False, 'error': 'Target client not found'}, status=404)

        with transaction.atomic():
            moved_groups = InspectionGroup.objects.filter(client=source).update(
                client=target, client_name=target.name,
            )
            FoodSafetyAgencyInspection.objects.filter(client=source).update(
                client=target, client_name=target.name,
            )
            for extra in ClientEmail.objects.filter(client=source):
                ClientEmail.objects.get_or_create(client=target, email=extra.email,
                                                  defaults={'label': extra.label})
            # Shipments cascade-delete with the client, so re-point them first
            source.shipments.update(client=target)
            # Keep any contact details the target is missing
            updates = []
            for field in ('town', 'corporate_group', 'group_type', 'facility_type', 'email', 'manual_email'):
                if not getattr(target, field) and getattr(source, field):
                    setattr(target, field, getattr(source, field))
                    updates.append(field)
            if updates:
                target.save(update_fields=updates)
            source_name = source.name

            ClientApprovalLog.objects.create(
                typed_name=source_name,
                final_name=target.name,
                outcome='merged',
                inspector=source.created_by,
                inspector_name=_created_by_label(source),
                decided_by=request.user,
                decided_by_name=_user_label(request.user),
                target_client=target,
                inspection_count=moved_groups,
                client_created_at=source.created_at,
            )

            source.delete()

        from django.core.cache import cache
        cache.delete('add_inspection_form_data')

        return JsonResponse({
            'success': True,
            'message': f'"{source_name}" merged into "{target.name}" ({moved_groups} inspection(s) moved).',
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
@login_required
@require_capability('manage_clients')
def api_clients_approval_report(request):
    """GET ?date_from=&date_to=&inspector= — per-inspector client-entry report.

    Same shape as the Late Capture report: every auto-created client decided in
    the range counts toward the inspector who captured it — 'accepted' entries
    were genuinely new clients (fine), 'merged' ones were duplicates the back
    office had to match to an existing client (the inspector typed a new name
    instead of selecting the client). Defaults to the last 90 days.
    """
    import datetime

    def _parse_date(name):
        raw = (request.GET.get(name) or '').strip()
        try:
            return datetime.datetime.strptime(raw, '%Y-%m-%d').date() if raw else None
        except ValueError:
            return None

    date_to = _parse_date('date_to') or datetime.date.today()
    date_from = _parse_date('date_from') or (date_to - datetime.timedelta(days=90))

    logs = ClientApprovalLog.objects.filter(
        decided_at__date__gte=date_from, decided_at__date__lte=date_to,
    )
    inspector = (request.GET.get('inspector') or '').strip()
    if inspector:
        logs = logs.filter(inspector_name=inspector)
    logs = list(logs.order_by('-decided_at'))

    per_inspector = {}
    monthly = {}
    for e in logs:
        key = e.inspector_name or '—'
        s = per_inspector.setdefault(key, {'inspector_name': key, 'total': 0, 'accepted': 0, 'merged': 0})
        s['total'] += 1
        s[e.outcome] = s.get(e.outcome, 0) + 1
        mk = e.decided_at.strftime('%Y-%m')
        m = monthly.setdefault(mk, {'month': mk, 'total': 0, 'merged': 0})
        m['total'] += 1
        if e.outcome == 'merged':
            m['merged'] += 1

    inspectors = []
    for s in per_inspector.values():
        s['error_pct'] = round(s['merged'] * 100 / s['total']) if s['total'] else 0
        inspectors.append(s)
    # Worst offenders first: most incorrect entries, then highest error rate
    inspectors.sort(key=lambda r: (-r['merged'], -r['error_pct'], r['inspector_name'].lower()))

    incidents = [
        {
            'typed_name': e.typed_name,
            'correct_name': e.final_name,
            'inspector_name': e.inspector_name or '—',
            'inspection_count': e.inspection_count,
            'captured_at': e.client_created_at.isoformat() if e.client_created_at else None,
            'decided_at': e.decided_at.isoformat() if e.decided_at else None,
            'decided_by': e.decided_by_name or '—',
        }
        for e in logs if e.outcome == 'merged'
    ][:300]

    # ── Back-office turnaround: approvals must happen within APPROVAL_LAG_DAYS
    # of the inspector creating the client — same rule shape as late captures.
    APPROVAL_LAG_DAYS = 2

    per_reviewer = {}
    late_decisions = []
    approval_monthly = {}
    for e in logs:
        if not e.client_created_at:
            continue
        days_taken = (e.decided_at.date() - e.client_created_at.date()).days
        mk = e.decided_at.strftime('%Y-%m')
        am = approval_monthly.setdefault(mk, {'month': mk, 'total': 0, 'late': 0})
        am['total'] += 1
        if days_taken > APPROVAL_LAG_DAYS:
            am['late'] += 1
        key = e.decided_by_name or '—'
        r = per_reviewer.setdefault(key, {'reviewer': key, 'total': 0, 'late': 0, '_sum': 0, 'max_days': 0})
        r['total'] += 1
        r['_sum'] += days_taken
        r['max_days'] = max(r['max_days'], days_taken)
        if days_taken > APPROVAL_LAG_DAYS:
            r['late'] += 1
            late_decisions.append({
                'typed_name': e.typed_name,
                'final_name': e.final_name,
                'outcome': e.outcome,
                'inspector_name': e.inspector_name or '—',
                'captured_at': e.client_created_at.isoformat(),
                'decided_at': e.decided_at.isoformat(),
                'days_taken': days_taken,
                'decided_by': key,
            })
    reviewers = []
    for r in per_reviewer.values():
        reviewers.append({
            'reviewer': r['reviewer'],
            'total': r['total'],
            'late': r['late'],
            'late_pct': round(r['late'] * 100 / r['total']) if r['total'] else 0,
            'avg_days': round(r['_sum'] / r['total'], 1) if r['total'] else 0,
            'max_days': r['max_days'],
        })
    reviewers.sort(key=lambda r: (-r['late'], -r['late_pct'], r['reviewer'].lower()))
    late_decisions.sort(key=lambda d: -d['days_taken'])

    # Clients sitting in the queue RIGHT NOW (not date-filtered — it's a live view)
    today = datetime.date.today()
    pending_rows = []
    for c in Client.objects.filter(approval_status='pending').select_related('created_by').order_by('created_at'):
        days_waiting = (today - c.created_at.date()).days if c.created_at else 0
        pending_rows.append({
            'name': c.name,
            'created_by': _created_by_label(c),
            'created_at': c.created_at.isoformat() if c.created_at else None,
            'days_waiting': days_waiting,
            'overdue': days_waiting > APPROVAL_LAG_DAYS,
        })

    return JsonResponse({
        'success': True,
        'date_from': date_from.isoformat(),
        'date_to': date_to.isoformat(),
        'total_decided': len(logs),
        'total_accepted': sum(1 for e in logs if e.outcome == 'accepted'),
        'total_merged': sum(1 for e in logs if e.outcome == 'merged'),
        'inspectors': inspectors,
        'incidents': incidents,
        'monthly': sorted(monthly.values(), key=lambda m: m['month']),
        'approval_lag_days': APPROVAL_LAG_DAYS,
        'reviewers': reviewers,
        'approval_monthly': sorted(approval_monthly.values(), key=lambda m: m['month']),
        'late_decisions': late_decisions[:300],
        'pending': pending_rows,
        'pending_overdue': sum(1 for p in pending_rows if p['overdue']),
    })
