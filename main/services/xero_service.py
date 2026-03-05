"""
Xero Accounting Integration Service
OAuth2 authentication and API communication with Xero.
"""
import requests
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
XERO_API_URL = 'https://api.xero.com/api.xro/2.0'
XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'

# Simplified scopes for uncertified apps
# accounting.transactions grants full read/write to transactions
# Avoid .read suffix and openid/profile/email which may not be available
XERO_SCOPES = 'accounting.transactions offline_access'


def get_authorization_url(state='xero_auth'):
    """Build the Xero OAuth2 authorization URL."""
    params = {
        'response_type': 'code',
        'client_id': settings.XERO_CLIENT_ID,
        'redirect_uri': settings.XERO_REDIRECT_URI,
        'scope': XERO_SCOPES,
        'state': state,
    }
    return f"{XERO_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code):
    """Exchange authorization code for access and refresh tokens."""
    response = requests.post(
        XERO_TOKEN_URL,
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.XERO_REDIRECT_URI,
        },
        auth=(settings.XERO_CLIENT_ID, settings.XERO_CLIENT_SECRET),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    response.raise_for_status()
    return response.json()


def refresh_access_token(refresh_token):
    """Refresh an expired access token."""
    response = requests.post(
        XERO_TOKEN_URL,
        data={
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
        },
        auth=(settings.XERO_CLIENT_ID, settings.XERO_CLIENT_SECRET),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )
    response.raise_for_status()
    return response.json()


def get_tenant_connections(access_token):
    """Get the list of connected Xero tenants/organisations."""
    response = requests.get(
        XERO_CONNECTIONS_URL,
        headers={'Authorization': f'Bearer {access_token}'},
    )
    response.raise_for_status()
    return response.json()


def _get_valid_token():
    """Get a valid access token, refreshing if needed. Returns (access_token, tenant_id) or (None, None)."""
    from ..models import XeroToken

    token = XeroToken.objects.first()
    if not token:
        return None, None

    if token.is_expired:
        try:
            data = refresh_access_token(token.refresh_token)
            token.access_token = data['access_token']
            token.refresh_token = data.get('refresh_token', token.refresh_token)
            token.expires_at = timezone.now() + timedelta(seconds=data.get('expires_in', 1800))
            token.save()
            logger.info('Xero token refreshed successfully')
        except Exception as e:
            logger.error(f'Failed to refresh Xero token: {e}')
            return None, None

    return token.access_token, token.tenant_id


def _api_get(endpoint, params=None):
    """Make an authenticated GET request to the Xero API."""
    access_token, tenant_id = _get_valid_token()
    if not access_token:
        raise Exception('Not connected to Xero. Please connect first.')

    response = requests.get(
        f"{XERO_API_URL}/{endpoint}",
        params=params,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Xero-Tenant-Id': tenant_id,
            'Accept': 'application/json',
        },
    )
    response.raise_for_status()
    return response.json()


def get_invoices(status=None, page=1):
    """Fetch invoices from Xero. Returns list of invoice dicts."""
    params = {
        'page': page,
        'order': 'DueDate DESC',
    }
    if status:
        params['Statuses'] = status

    data = _api_get('Invoices', params)
    return data.get('Invoices', [])


def get_all_invoices():
    """Fetch all AUTHORISED and PAID invoices (ACCREC = sales invoices)."""
    all_invoices = []

    for status in ['AUTHORISED', 'PAID']:
        page = 1
        while True:
            invoices = get_invoices(status=status, page=page)
            if not invoices:
                break
            all_invoices.extend(invoices)
            if len(invoices) < 100:
                break
            page += 1

    return all_invoices


def sync_invoices_to_db():
    """Pull invoices from Xero and sync to local XeroInvoice table."""
    from ..models import XeroInvoice

    invoices = get_all_invoices()
    synced = 0
    errors = 0

    for inv in invoices:
        try:
            xero_id = inv.get('InvoiceID', '')
            if not xero_id:
                continue

            # Parse dates
            date_str = inv.get('DateString', '')
            due_date_str = inv.get('DueDateString', '')
            paid_date_str = inv.get('FullyPaidOnDate', '')

            inv_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else None
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None
            paid_date = None
            if paid_date_str:
                try:
                    paid_date = datetime.strptime(paid_date_str[:10], '%Y-%m-%d').date()
                except (ValueError, IndexError):
                    pass

            contact = inv.get('Contact', {})

            XeroInvoice.objects.update_or_create(
                xero_invoice_id=xero_id,
                defaults={
                    'invoice_number': inv.get('InvoiceNumber', ''),
                    'contact_name': contact.get('Name', ''),
                    'contact_id': contact.get('ContactID', ''),
                    'reference': inv.get('Reference', ''),
                    'status': inv.get('Status', 'DRAFT'),
                    'invoice_type': inv.get('Type', 'ACCREC'),
                    'currency_code': inv.get('CurrencyCode', 'ZAR'),
                    'sub_total': inv.get('SubTotal', 0),
                    'total_tax': inv.get('TotalTax', 0),
                    'total': inv.get('Total', 0),
                    'amount_due': inv.get('AmountDue', 0),
                    'amount_paid': inv.get('AmountPaid', 0),
                    'date': inv_date,
                    'due_date': due_date,
                    'fully_paid_on_date': paid_date,
                }
            )
            synced += 1
        except Exception as e:
            logger.error(f'Error syncing Xero invoice {inv.get("InvoiceNumber", "?")}: {e}')
            errors += 1

    return {'synced': synced, 'errors': errors, 'total': len(invoices)}


def get_contacts(page=1):
    """Fetch contacts from Xero."""
    data = _api_get('Contacts', {'page': page})
    return data.get('Contacts', [])


def is_connected():
    """Check if Xero is connected and tokens are valid."""
    from ..models import XeroToken
    token = XeroToken.objects.first()
    if not token:
        return False
    if token.is_expired:
        try:
            access_token, _ = _get_valid_token()
            return access_token is not None
        except Exception:
            return False
    return True
