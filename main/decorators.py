from django.shortcuts import redirect
from django.contrib import messages
from django.http import HttpResponse
from functools import wraps
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.utils import timezone
import hashlib

def role_required(allowed_roles):
    """
    Decorator to check if user has the required role(s).
    
    Usage:
    @role_required(['admin', 'super_admin'])
    @role_required(['financial'])
    @role_required(['inspector'])
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('login')
            
            user_role = getattr(request.user, 'role', 'inspector')
            
            # Check if user's role is in the allowed roles
            if user_role in allowed_roles:
                return view_func(request, *args, **kwargs)
            else:
                return redirect('home')
        
        return _wrapped_view
    return decorator

def inspector_restricted(view_func):
    """
    Decorator to restrict Inspector access to specific features.
    Inspectors cannot upload invoicing or lab results.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = getattr(request.user, 'role', 'inspector')
        
        # If user is an inspector, deny access
        if user_role == 'inspector':
            return redirect('home')
        
        # Allow access for all other roles
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view

def financial_only(view_func):
    """
    Decorator to restrict access to financial features only.
    Only financial, admin, and super_admin roles can access.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = getattr(request.user, 'role', 'inspector')
        allowed_roles = ['financial', 'admin', 'super_admin']
        
        if user_role in allowed_roles:
            return view_func(request, *args, **kwargs)
        else:
            return redirect('home')
    
    return _wrapped_view


def inspector_only_inspections(view_func):
    """
    Decorator to restrict Inspector and Lab Technician access to only the inspections page.
    Inspectors and Lab Technicians can only access the inspections page and related inspection functions.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = getattr(request.user, 'role', 'inspector')
        
        # If user is an inspector or scientist (lab technician), redirect to inspections page
        if user_role == 'inspector' or user_role == 'scientist':
            role_display = "Inspector" if user_role == 'inspector' else "Lab Technician"
            return redirect('shipment_list')
        
        # Allow access for all other roles
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view


def scientist_only(view_func):
    """
    Decorator to restrict access to scientist features only.
    Only scientist, admin, and super_admin roles can access.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = getattr(request.user, 'role', 'inspector')
        allowed_roles = ['scientist', 'admin', 'super_admin']
        
        if user_role in allowed_roles:
            return view_func(request, *args, **kwargs)
        else:
            return redirect('home')
    
    return _wrapped_view


def no_inspector_scientist(view_func):
    """
    Decorator to block inspector and scientist access to specific functions.
    Used for functions that should only be accessible by admin, super_admin, developer, and financial roles.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        
        user_role = getattr(request.user, 'role', 'inspector')
        
        # Block inspectors and scientists from accessing this function
        if user_role in ['inspector', 'scientist']:
            from django.http import JsonResponse
            return JsonResponse({
                'success': False, 
                'error': f'Access denied: {user_role.title()}s cannot perform this action'
            })
        
        # Allow access for all other roles
        return view_func(request, *args, **kwargs)
    
    return _wrapped_view

def ratelimit(max_attempts=5, window_seconds=300, block_duration=900):
    """
    Rate limiting decorator to prevent brute force attacks.
    
    Args:
        max_attempts: Maximum number of attempts allowed (default: 5)
        window_seconds: Time window in seconds to count attempts (default: 300 = 5 minutes)
        block_duration: How long to block after max attempts (default: 900 = 15 minutes)
    
    Usage:
        @ratelimit(max_attempts=5, window_seconds=300, block_duration=900)
        def login_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Get client identifier (IP + User Agent hash for better uniqueness)
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                client_ip = x_forwarded_for.split(',')[0].strip()
            else:
                client_ip = request.META.get('REMOTE_ADDR', 'unknown')
            
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            identifier = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()[:16]
            
            # Cache keys
            attempts_key = f'ratelimit:attempts:{identifier}'
            blocked_key = f'ratelimit:blocked:{identifier}'
            
            # Check if currently blocked
            if cache.get(blocked_key):
                time_remaining = cache.ttl(blocked_key)
                minutes_remaining = time_remaining // 60
                return HttpResponse(
                    f'Too many failed attempts. Please try again in {minutes_remaining} minutes.',
                    status=429
                )
            
            # For POST requests (actual login attempts), increment counter
            if request.method == 'POST':
                # Get current attempt count
                attempts = cache.get(attempts_key, 0)
                attempts += 1
                
                # Store updated attempts
                cache.set(attempts_key, attempts, window_seconds)
                
                # Check if max attempts exceeded
                if attempts > max_attempts:
                    # Block the client
                    cache.set(blocked_key, True, block_duration)
                    cache.delete(attempts_key)
                    
                    # Log the security event
                    try:
                        from .models import SystemLog
                        SystemLog.log_security_event(
                            event_type='RATE_LIMIT_EXCEEDED',
                            description=f'Rate limit exceeded from IP: {client_ip}',
                            ip_address=client_ip,
                            severity='WARNING'
                        )
                    except Exception as e:
                        print(f"Failed to log rate limit event: {e}")
                    
                    return HttpResponse(
                        f'Too many failed attempts. Your access has been temporarily blocked for {block_duration // 60} minutes.',
                        status=429
                    )
            
            # Call the actual view
            response = view_func(request, *args, **kwargs)
            
            # If login was successful (check for redirect or success status), clear attempts
            if request.method == 'POST' and (
                (hasattr(response, 'status_code') and response.status_code == 302) or
                (hasattr(request, 'user') and request.user.is_authenticated)
            ):
                cache.delete(attempts_key)
            
            return response
        
        return _wrapped_view
    return decorator
