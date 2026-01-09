from functools import lru_cache

from django import template

from main.models import InspectorMapping

register = template.Library()


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


