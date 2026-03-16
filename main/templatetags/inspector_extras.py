import re
from functools import lru_cache

from django import template

from main.models import InspectorMapping

register = template.Library()

_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')

# Common domain typos: .coza → .co.za, .coz → .co.za, etc.
_BAD_DOMAIN_ENDINGS = re.compile(r'\.(coza|coz|coaz|co\.z)$', re.IGNORECASE)


def _is_valid_email(email):
    """Check if a string looks like a valid email address."""
    if not email or not isinstance(email, str):
        return False
    e = email.strip()
    if not _EMAIL_RE.match(e):
        return False
    # Catch common SA domain typos like .coza instead of .co.za
    if _BAD_DOMAIN_ENDINGS.search(e):
        return False
    return True


def _split_email_field(value):
    """Split an email field on commas, semicolons, slashes, and spaces.
    Returns only non-empty stripped parts. Handles messy data like:
    - 'a@b.com/c@d.com'
    - 'a@b.com c@d.com'
    - '"a@b.com'
    - 'Name a@b.com'
    """
    if not value:
        return []
    # Split on comma, semicolon, slash, or whitespace
    parts = re.split(r'[,;/\s]+', str(value))
    # Strip quotes and whitespace, keep non-empty
    return [p.strip().strip('"').strip("'") for p in parts if p.strip()]


@register.filter(name='is_valid_email')
def is_valid_email(value):
    """Template filter to check if a value is a valid email.
    Usage: {% if email|is_valid_email %}...{% endif %}
    """
    return _is_valid_email(value)


@register.filter(name='split_emails')
def split_emails(value):
    """Split comma-separated email string into a list of trimmed emails.

    Usage: {% for email in shipment.additional_email|split_emails %}
    """
    if not value:
        return []
    return [email.strip() for email in value.split(',') if email.strip()]


@register.filter(name='get_unique_emails')
def get_unique_emails(shipment):
    """Get all unique emails for a shipment (from client and inspection).

    Usage: {% for email in shipment|get_unique_emails %}
    """
    emails_set = set()

    # Handle both dict and object access
    if isinstance(shipment, dict):
        client_emails = shipment.get('client_emails', [])
        additional_email = shipment.get('additional_email', '')
    else:
        client_emails = getattr(shipment, 'client_emails', [])
        additional_email = getattr(shipment, 'additional_email', '')

    # Add client emails
    if client_emails:
        for client_email in client_emails:
            # Handle both dict and object
            if isinstance(client_email, dict):
                email = client_email.get('email', '')
            else:
                email = getattr(client_email, 'email', '')
            if email:
                # Split on comma/semicolon/slash/space
                for e in _split_email_field(email):
                    if e:
                        emails_set.add(e)

    # Add inspection additional_email
    if additional_email:
        for email in _split_email_field(additional_email):
            if email:
                emails_set.add(email)

    # Return sorted list for consistent display
    return sorted(list(emails_set))


@register.filter(name='get_client_emails')
def get_client_emails(shipment):
    """Get only client emails (not inspection additional_email).

    Usage: {% for email in shipment|get_client_emails %}
    """
    if isinstance(shipment, dict):
        client_emails = shipment.get('client_emails', [])
    else:
        client_emails = getattr(shipment, 'client_emails', [])

    emails = []
    seen = set()
    if client_emails:
        for client_email in client_emails:
            if isinstance(client_email, dict):
                raw = client_email.get('email', '')
            else:
                raw = getattr(client_email, 'email', '')
            if raw:
                # Split comma/semicolon/slash/space-separated emails
                for email in _split_email_field(raw):
                    if email and email.lower() not in seen:
                        seen.add(email.lower())
                        emails.append(email)

    return emails


@register.filter(name='get_extra_emails')
def get_extra_emails(shipment):
    """Get emails from additional_email that are NOT already in client_emails.

    Usage: {{ shipment|get_extra_emails }}
    """
    # Collect client emails
    client_email_set = set()
    if isinstance(shipment, dict):
        client_emails = shipment.get('client_emails', [])
        additional_email = shipment.get('additional_email', '')
    else:
        client_emails = getattr(shipment, 'client_emails', [])
        additional_email = getattr(shipment, 'additional_email', '')

    if client_emails:
        for client_email in client_emails:
            if isinstance(client_email, dict):
                raw = client_email.get('email', '')
            else:
                raw = getattr(client_email, 'email', '')
            if raw:
                for email in _split_email_field(raw):
                    if email:
                        client_email_set.add(email.lower())

    # Filter additional_email to only those NOT in client emails
    extra = []
    if additional_email:
        for email in _split_email_field(additional_email):
            if email and email.lower() not in client_email_set:
                extra.append(email)

    return ', '.join(extra)


@lru_cache(maxsize=1)
def _id_to_name_map():
    return {m.inspector_id: m.inspector_name for m in InspectorMapping.objects.all()}


@register.filter(name='display_inspector')
def display_inspector(inspector_name, inspector_id):
    """Return a friendly inspector display: prefer provided name; if blank/Unknown, map from ID.

    Usage: {{ shipment.inspector_name|display_inspector:shipment.inspector_id }}
    """
    name = (inspector_name or '').strip()
    if name and name.lower() != 'unknown':
        return name

    if not inspector_id:
        return name or '-'

    mapped = _id_to_name_map().get(inspector_id)
    if mapped:
        return mapped
    return "Unknown"


