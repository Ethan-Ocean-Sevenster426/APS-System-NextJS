"""
Xero Accounting Integration Views
OAuth2 connect/callback, invoice sync, and status endpoints.
"""
import logging
from datetime import timedelta, date
from decimal import Decimal
from django.shortcuts import redirect, render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.db.models import Sum, Q, Count

from ..services import xero_service
from ..models import XeroToken, XeroInvoice

logger = logging.getLogger(__name__)


@login_required
def xero_connect(request):
    """Redirect user to Xero OAuth2 authorization page."""
    if request.user.role not in ('admin', 'super_admin', 'developer'):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    url = xero_service.get_authorization_url()
    return redirect(url)


@login_required
def xero_callback(request):
    """Handle Xero OAuth2 callback after user authorizes."""
    code = request.GET.get('code')
    error = request.GET.get('error')

    if error:
        logger.error(f'Xero OAuth error: {error}')
        return redirect('/analytics-dashboard/#financial')

    if not code:
        logger.error('Xero callback: no code received')
        return redirect('/analytics-dashboard/#financial')

    try:
        # Exchange code for tokens
        token_data = xero_service.exchange_code_for_tokens(code)

        access_token = token_data['access_token']
        refresh_token = token_data.get('refresh_token', '')
        expires_in = token_data.get('expires_in', 1800)

        # Get tenant info
        connections = xero_service.get_tenant_connections(access_token)
        tenant_id = ''
        tenant_name = ''
        if connections:
            tenant_id = connections[0].get('tenantId', '')
            tenant_name = connections[0].get('tenantName', '')

        # Store token (replace any existing)
        XeroToken.objects.all().delete()
        XeroToken.objects.create(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=timezone.now() + timedelta(seconds=expires_in),
            tenant_id=tenant_id,
            tenant_name=tenant_name,
        )

        logger.info(f'Xero connected successfully to: {tenant_name}')

    except Exception as e:
        logger.error(f'Xero callback error: {e}')

    return redirect('/analytics-dashboard/#financial')


@login_required
def xero_disconnect(request):
    """Disconnect from Xero by removing stored tokens."""
    if request.user.role not in ('admin', 'super_admin', 'developer'):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    XeroToken.objects.all().delete()
    logger.info('Xero disconnected')
    return JsonResponse({'status': 'disconnected'})


@login_required
def xero_status(request):
    """Check Xero connection status."""
    token = XeroToken.objects.first()
    if not token:
        return JsonResponse({'connected': False})

    connected = xero_service.is_connected()
    return JsonResponse({
        'connected': connected,
        'tenant_name': token.tenant_name if connected else '',
        'expires_at': token.expires_at.isoformat() if connected else '',
    })


@login_required
@require_POST
def xero_sync_invoices(request):
    """Trigger a sync of invoices from Xero."""
    if request.user.role not in ('admin', 'super_admin', 'developer'):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    try:
        result = xero_service.sync_invoices_to_db()
        return JsonResponse({
            'status': 'success',
            'synced': result['synced'],
            'errors': result['errors'],
            'total': result['total'],
        })
    except Exception as e:
        logger.error(f'Xero sync error: {e}')
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def xero_invoices_list(request):
    """Return synced Xero invoices as JSON for the dashboard."""
    invoices = XeroInvoice.objects.all()

    # Optional filters
    status = request.GET.get('status')
    if status:
        invoices = invoices.filter(status=status)

    data = []
    aging_summary = {'Current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '91-120': 0, '120+': 0}

    for inv in invoices:
        bucket = inv.aging_bucket
        if inv.status != 'PAID':
            aging_summary[bucket] = aging_summary.get(bucket, 0) + float(inv.amount_due)

        data.append({
            'invoice_number': inv.invoice_number,
            'contact_name': inv.contact_name,
            'reference': inv.reference,
            'status': inv.status,
            'total': float(inv.total),
            'amount_due': float(inv.amount_due),
            'amount_paid': float(inv.amount_paid),
            'date': inv.date.isoformat() if inv.date else '',
            'due_date': inv.due_date.isoformat() if inv.due_date else '',
            'days_outstanding': inv.days_outstanding,
            'aging_bucket': bucket,
        })

    return JsonResponse({
        'invoices': data,
        'aging_summary': aging_summary,
        'total_outstanding': sum(aging_summary.values()),
        'count': len(data),
    })


@login_required
def debtors_page(request):
    """Debtors page - shows outstanding invoices from Xero with aging analysis."""
    if request.user.role not in ('admin', 'super_admin', 'developer'):
        from django.http import HttpResponseForbidden
        return HttpResponseForbidden('Permission denied')

    # Check Xero connection
    xero_connected = xero_service.is_connected()
    token = XeroToken.objects.first()
    tenant_name = token.tenant_name if token else ''

    # Get all ACCREC (sales) invoices
    all_invoices = XeroInvoice.objects.filter(invoice_type='ACCREC')
    outstanding_invoices = all_invoices.filter(
        status__in=['AUTHORISED', 'SUBMITTED']
    ).order_by('due_date')

    # Aging buckets
    today = date.today()
    aging = {
        'current': {'invoices': [], 'total': Decimal('0')},
        '1_30': {'invoices': [], 'total': Decimal('0')},
        '31_60': {'invoices': [], 'total': Decimal('0')},
        '61_90': {'invoices': [], 'total': Decimal('0')},
        '91_120': {'invoices': [], 'total': Decimal('0')},
        '120_plus': {'invoices': [], 'total': Decimal('0')},
    }

    for inv in outstanding_invoices:
        days = inv.days_outstanding
        if days <= 0:
            bucket = 'current'
        elif days <= 30:
            bucket = '1_30'
        elif days <= 60:
            bucket = '31_60'
        elif days <= 90:
            bucket = '61_90'
        elif days <= 120:
            bucket = '91_120'
        else:
            bucket = '120_plus'
        aging[bucket]['invoices'].append(inv)
        aging[bucket]['total'] += inv.amount_due

    # Summary stats
    total_outstanding = outstanding_invoices.aggregate(
        total=Sum('amount_due')
    )['total'] or Decimal('0')
    total_overdue = sum(
        inv.amount_due for inv in outstanding_invoices
        if inv.due_date and inv.due_date < today
    )
    total_invoices = outstanding_invoices.count()
    paid_invoices = all_invoices.filter(status='PAID')
    total_paid = paid_invoices.aggregate(
        total=Sum('amount_paid')
    )['total'] or Decimal('0')

    # Debtor breakdown by contact
    debtor_summary = outstanding_invoices.values('contact_name').annotate(
        total_due=Sum('amount_due'),
        invoice_count=Count('id'),
    ).order_by('-total_due')

    # Last sync time
    last_sync = all_invoices.order_by('-synced_at').first()
    last_sync_time = last_sync.synced_at if last_sync else None

    context = {
        'xero_connected': xero_connected,
        'tenant_name': tenant_name,
        'outstanding_invoices': outstanding_invoices,
        'aging': aging,
        'total_outstanding': total_outstanding,
        'total_overdue': total_overdue,
        'total_invoices': total_invoices,
        'total_paid': total_paid,
        'debtor_summary': debtor_summary,
        'last_sync_time': last_sync_time,
        'today': today,
    }
    return render(request, 'main/debtors.html', context)
