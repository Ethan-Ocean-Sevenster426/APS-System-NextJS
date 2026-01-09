from django.contrib import messages
from django.db.models import Q
from datetime import datetime, timedelta

def clear_messages(request):
    """Clear any existing messages from the request."""
    try:
        storage = messages.get_messages(request)
        for message in storage:
            pass
        if hasattr(storage, 'used'):
            storage.used = True
    except Exception:
        # Ignore errors in message clearing
        pass

def apply_filters(request, queryset):
    """Apply filters to the queryset based on request parameters."""
    # Get filter parameters from request
    claim_no = request.GET.get('claim_no', '').strip()
    client_reference = request.GET.get('client_reference', '').strip()
    client_id = request.GET.get('client')
    branch = request.GET.get('branch', '').strip()
    intend_date_from = request.GET.get('intend_date_from', '').strip()
    intend_date_to = request.GET.get('intend_date_to', '').strip()
    formal_date_from = request.GET.get('formal_date_from', '').strip()
    formal_date_to = request.GET.get('formal_date_to', '').strip()
    
    # Apply filters
    if claim_no:
        queryset = queryset.filter(Claim_No__icontains=claim_no)
    
    if client_reference:
        queryset = queryset.filter(Client_Reference__icontains=client_reference)
    
    if client_id:
        queryset = queryset.filter(client_id=client_id)
    
    if branch:
        queryset = queryset.filter(Branch__icontains=branch)
    
    if intend_date_from:
        try:
            date_obj = datetime.strptime(intend_date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(Intend_Claim_Date__gte=date_obj)
        except ValueError:
            pass
    
    if intend_date_to:
        try:
            date_obj = datetime.strptime(intend_date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(Intend_Claim_Date__lte=date_obj)
        except ValueError:
            pass
    
    if formal_date_from:
        try:
            date_obj = datetime.strptime(formal_date_from, '%Y-%m-%d').date()
            queryset = queryset.filter(Formal_Claim_Date_Received__gte=date_obj)
        except ValueError:
            pass
    
    if formal_date_to:
        try:
            date_obj = datetime.strptime(formal_date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(Formal_Claim_Date_Received__lte=date_obj)
        except ValueError:
            pass
    
    return queryset
