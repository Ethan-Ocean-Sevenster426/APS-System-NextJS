"""
Microsoft Graph API Inbox Reader
Reads undeliverable/bounce-back emails from the shared mailbox inbox.
"""
import logging
import re
import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

UNDELIVERABLE_CACHE_KEY = 'graph_undeliverable_emails'
UNDELIVERABLE_CACHE_TTL = 600  # 10 minutes


def _get_access_token():
    """Obtain an access token using client credentials flow."""
    client_id = getattr(settings, 'GRAPH_CLIENT_ID', '')
    client_secret = getattr(settings, 'GRAPH_CLIENT_SECRET', '')
    tenant_id = getattr(settings, 'GRAPH_TENANT_ID', '')

    if not all([client_id, client_secret, tenant_id]):
        logger.error("Graph API credentials not configured")
        return None

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    token_data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
        'scope': 'https://graph.microsoft.com/.default'
    }

    try:
        response = requests.post(token_url, data=token_data, timeout=30)
        response.raise_for_status()
        return response.json().get('access_token')
    except Exception as e:
        logger.error(f"Failed to get Graph access token: {e}")
        return None


def _extract_bounced_emails(body_text):
    """
    Extract email addresses from an undeliverable bounce message body.
    Looks for email patterns in the bounce notification text.
    """
    if not body_text:
        return set()

    emails = set()
    # Common patterns in NDR messages
    # "Delivery has failed to these recipients or groups: user@domain.com"
    # "user@domain.com Remote Server returned..."
    # "<user@domain.com>"
    email_pattern = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
    found = email_pattern.findall(body_text.lower())

    from_email = (getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '').lower()

    for email in found:
        # Skip our own sending address and common system addresses
        if email == from_email:
            continue
        if any(skip in email for skip in [
            'postmaster@', 'mailer-daemon@', 'noreply@',
            'no-reply@', 'microsoftonline', 'microsoft.com',
            'protection.outlook.com'
        ]):
            continue
        emails.add(email)

    return emails


def fetch_undeliverable_emails(force_refresh=False):
    """
    Fetch undeliverable email addresses from the shared mailbox inbox.
    Returns a set of email addresses that have bounced.
    Results are cached for 10 minutes.
    """
    if not force_refresh:
        cached = cache.get(UNDELIVERABLE_CACHE_KEY)
        if cached is not None:
            return cached

    token = _get_access_token()
    if not token:
        return set()

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
    if not from_email:
        return set()

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    bounced_emails = set()

    # Search for undeliverable/bounce messages in the inbox
    # NDR messages typically have subjects containing "Undeliverable" or "Delivery Status Notification"
    search_filters = [
        "subject eq 'Undeliverable'",
        "contains(subject, 'Undeliverable')",
    ]

    base_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/mailFolders/inbox/messages"

    for search_filter in search_filters:
        try:
            params = {
                '$filter': search_filter,
                '$select': 'subject,body,receivedDateTime,from',
                '$top': 200,
                '$orderby': 'receivedDateTime desc'
            }

            response = requests.get(base_url, headers=headers, params=params, timeout=30)

            if response.status_code != 200:
                logger.warning(f"Graph inbox query failed ({response.status_code}): {response.text[:200]}")
                continue

            messages = response.json().get('value', [])
            logger.info(f"Found {len(messages)} undeliverable messages with filter: {search_filter}")

            for msg in messages:
                body_content = msg.get('body', {}).get('content', '')
                # Strip HTML tags for easier parsing
                clean_body = re.sub(r'<[^>]+>', ' ', body_content)
                found_emails = _extract_bounced_emails(clean_body)
                bounced_emails.update(found_emails)

            # If first filter returns results, skip the second to avoid duplicates
            if messages:
                break

        except Exception as e:
            logger.error(f"Error fetching undeliverable emails: {e}")
            continue

    logger.info(f"Total unique bounced email addresses found: {len(bounced_emails)}")
    cache.set(UNDELIVERABLE_CACHE_KEY, bounced_emails, UNDELIVERABLE_CACHE_TTL)
    return bounced_emails
