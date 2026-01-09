from django import template
import re

register = template.Library()

@register.filter
def sanitize_group_id(text):
    """Sanitize text for use as group ID - matches backend logic"""
    if not text:
        return ""
    # Replace special characters with underscores to match backend folder naming
    # This matches the sanitize_folder_name function in upload_document view
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', text)
    # Remove multiple consecutive underscores
    sanitized = re.sub(r'_+', '_', sanitized)
    # Remove leading/trailing underscores
    sanitized = sanitized.strip('_')
    return sanitized if sanitized else "Unknown_Client"
