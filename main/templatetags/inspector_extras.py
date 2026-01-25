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
                emails_set.add(email.strip())

    # Add inspection additional_email
    if additional_email:
        for email in additional_email.split(','):
            email = email.strip()
            if email:
                emails_set.add(email)

    # Return sorted list for consistent display
    return sorted(list(emails_set))


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


