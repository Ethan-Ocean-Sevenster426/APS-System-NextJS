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
    Extract the actual failed recipient email address(es) from an NDR bounce message.
    Uses targeted patterns specific to Exchange/Outlook NDR format to avoid false
    positives from sender, CC, or other addresses mentioned in the bounce body.
    """
    if not body_text:
        return set()

    emails = set()

    # Strip HTML tags for plain-text pattern matching
    clean_text = re.sub(r'<[^>]+>', ' ', body_text)
    clean_text = re.sub(r'&[a-z]+;', ' ', clean_text)  # unescape HTML entities
    clean_text = re.sub(r'\s+', ' ', clean_text)

    email_re = r'[\w.+-]+@[\w-]+\.[\w.-]+'

    # --- Targeted patterns that identify the actual failed recipient ---

    # Pattern 1 (Exchange NDR): "Delivery has failed to these recipients or groups:"
    # immediately followed by the failed email address
    for m in re.finditer(
        r'Delivery has failed to these recipients[^:]*:\s*(' + email_re + r')',
        clean_text, re.IGNORECASE
    ):
        emails.add(m.group(1).lower())

    # Pattern 2 (MIME DSN header): "Final-Recipient: rfc822; user@domain.com"
    for m in re.finditer(
        r'Final-Recipient\s*:\s*rfc822\s*;\s*(' + email_re + r')',
        body_text, re.IGNORECASE
    ):
        emails.add(m.group(1).lower())

    # Pattern 3: email address on its own line/section followed by SMTP error text
    # e.g. "user@domain.com\n\nRemote Server returned '550..."
    for m in re.finditer(
        r'(' + email_re + r')\s{0,10}(?:Remote Server|couldn\'t be delivered|SMTP|550|551|552|553|554)',
        clean_text, re.IGNORECASE
    ):
        emails.add(m.group(1).lower())

    # Pattern 4: "The following recipient(s) cannot be reached: user@domain.com"
    for m in re.finditer(
        r'recipient[s]?\s+cannot be reached\s*[:\s]+(' + email_re + r')',
        clean_text, re.IGNORECASE
    ):
        emails.add(m.group(1).lower())

    # If none of the targeted patterns matched, log a warning but do NOT fall back
    # to extracting all emails — that causes false positives.
    if not emails:
        logger.warning("NDR body did not match any targeted patterns; no emails extracted to avoid false positives")
        return set()

    # Filter out system/infrastructure addresses that should never be flagged
    from_email = (getattr(settings, 'DEFAULT_FROM_EMAIL', '') or '').lower()
    skip_fragments = [
        'postmaster@', 'mailer-daemon@', 'noreply@', 'no-reply@',
        'microsoftonline', 'microsoft.com', 'protection.outlook.com',
        'prod.outlook.com',  # Exchange internal message routing IDs
    ]
    # Also skip our own internal sending domains to avoid flagging staff addresses
    internal_domains = [d.strip().lower() for d in getattr(settings, 'GRAPH_INTERNAL_DOMAINS', '').split(',') if d.strip()]

    filtered = set()
    for email in emails:
        if email == from_email:
            continue
        if any(frag in email for frag in skip_fragments):
            continue
        domain = email.split('@')[-1] if '@' in email else ''
        if domain and domain in internal_domains:
            continue
        filtered.add(email)

    return filtered


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

    # Use $search (not $filter) as Graph API doesn't support contains() on subject for inbox
    base_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/mailFolders/inbox/messages"

    try:
        params = {
            '$search': '"Undeliverable"',
            '$select': 'subject,body,bodyPreview,receivedDateTime',
            '$top': 200,
        }

        response = requests.get(base_url, headers=headers, params=params, timeout=30)

        if response.status_code != 200:
            logger.warning(f"Graph inbox search failed ({response.status_code}): {response.text[:200]}")
        else:
            messages = response.json().get('value', [])
            logger.info(f"Found {len(messages)} undeliverable messages")

            for msg in messages:
                # Use full body for reliable extraction — bodyPreview is only ~255 chars
                # and often cuts off before the bounced address appears
                body_obj = msg.get('body', {})
                body_text = body_obj.get('content', '') if isinstance(body_obj, dict) else ''
                if not body_text:
                    body_text = msg.get('bodyPreview', '')
                found_emails = _extract_bounced_emails(body_text)
                bounced_emails.update(found_emails)

    except Exception as e:
        logger.error(f"Error fetching undeliverable emails: {e}")

    logger.info(f"Total unique bounced email addresses found: {len(bounced_emails)}")
    # Only cache with full TTL when emails were found; use 60s for empty so it retries soon
    ttl = UNDELIVERABLE_CACHE_TTL if bounced_emails else 60
    cache.set(UNDELIVERABLE_CACHE_KEY, bounced_emails, ttl)
    return bounced_emails
