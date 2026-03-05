"""
Xero Accounting Integration Views
OAuth2 connect/callback, invoice sync, and status endpoints.
"""
import logging
from datetime import timedelta
from django.shortcuts import redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.views.decorators.http import require_POST

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
