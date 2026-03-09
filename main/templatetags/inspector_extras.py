from functools import lru_cache

from django import template

from main.models import InspectorMapping

register = template.Library()


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
                # Split comma-separated emails in a single field
                for e in email.split(','):
                    e = e.strip()
                    if e:
                        emails_set.add(e)

    # Add inspection additional_email
    if additional_email:
        for email in additional_email.split(','):
            email = email.strip()
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
                # Split comma-separated emails in a single field
                for email in raw.split(','):
                    email = email.strip()
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
                for email in raw.split(','):
                    email = email.strip()
                    if email:
                        client_email_set.add(email.lower())

    # Filter additional_email to only those NOT in client emails
    extra = []
    if additional_email:
        for email in additional_email.split(','):
            email = email.strip()
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


