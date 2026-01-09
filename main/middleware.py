from django.utils import timezone
from django.contrib.auth import logout
from django.shortcuts import redirect
from django.contrib import messages
from .models import Settings
from datetime import timedelta
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import User
from .models import SystemLog
import json


class SecurityHeadersMiddleware:
    """Middleware to add modern security headers to all responses"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content Security Policy - Restricts resource loading
        # Configured for Food Safety Agency application with CDN support
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https: http:; "
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Permissions Policy - Control browser features
        response['Permissions-Policy'] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # X-Content-Type-Options - Prevent MIME sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # X-Frame-Options - Prevent clickjacking (redundant but belt-and-suspenders)
        if 'X-Frame-Options' not in response:
            response['X-Frame-Options'] = 'DENY'

        # Referrer-Policy - Control referrer information
        response['Referrer-Policy'] = 'same-origin'

        # X-XSS-Protection - Legacy XSS filter (for older browsers)
        response['X-XSS-Protection'] = '1; mode=block'

        return response

class SessionTimeoutMiddleware:
    """Middleware to enforce session timeout based on database settings"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip middleware for login-related URLs
        if request.path.startswith('/login/'):
            return self.get_response(request)
            
        # Only check session timeout for authenticated users
        if request.user.is_authenticated:
            try:
                # Get settings from database
                settings = Settings.get_settings()
                session_timeout_minutes = settings.session_timeout
                
                # Get last activity from session
                last_activity = request.session.get('last_activity')
                current_time = timezone.now()
                
                if last_activity:
                    # Convert last_activity string back to datetime
                    last_activity = timezone.datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                    
                    # Check if session has expired
                    timeout_threshold = last_activity + timedelta(minutes=session_timeout_minutes)
                    
                    if current_time > timeout_threshold:
                        # Session expired - log out user
                        logout(request)
                        messages.warning(request, "Your session has expired. Please log in again.")
                        return redirect('login')
                
                # Update last activity timestamp only if not in sync operation
                if not getattr(request, '_sync_in_progress', False):
                    request.session['last_activity'] = current_time.isoformat()
                    # Don't explicitly save the session here to avoid conflicts
                    # Django will save it automatically at the end of the request
                
            except Exception as e:
                # If there's an error getting settings, use default 30 minutes
                print(f"Session timeout middleware error: {e}")
                # Don't let session errors break the request
                # But ensure session is valid for the request
                if not request.session.session_key:
                    try:
                        request.session.create()
                    except Exception as session_error:
                        print(f"Failed to create session: {session_error}")
                        pass
        
        response = self.get_response(request)
        
        # Prevent session save if response has the flag set
        if hasattr(response, '_session_save') and not response._session_save:
            # Mark the session as not modified to prevent save
            request.session.modified = False
        
        return response

class ActivityLoggingMiddleware(MiddlewareMixin):
    """Middleware to automatically log user activities"""
    
    def process_request(self, request):
        """Log the request before processing"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Get client IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Determine action based on request
            action = self._determine_action(request)
            
            # Only log if it's a meaningful action
            if action:
                try:
                    SystemLog.log_activity(
                        user=request.user,
                        action=action,
                        page=request.path,
                        ip_address=ip,
                        user_agent=user_agent,
                        description=self._get_description(request, action)
                    )
                except Exception as e:
                    # Don't let logging errors break the application
                    print(f"Error logging activity: {e}")
    
    def _determine_action(self, request):
        """Determine the action type based on the request"""
        path = request.path.lower()
        method = request.method.upper()
        
        # Login/Logout actions
        if path.endswith('/login/') and method == 'POST':
            return 'LOGIN'
        elif path.endswith('/logout/') and method == 'POST':
            return 'LOGOUT'
        
        # Navigation actions
        elif method == 'GET' and not path.startswith('/static/') and not path.startswith('/media/'):
            if 'home' in path:
                return 'NAVIGATE'
            elif 'settings' in path:
                return 'SETTINGS'
            elif 'user-management' in path:
                return 'USER_MANAGEMENT'
            elif 'system-logs' in path:
                return 'VIEW'
            elif 'analytics' in path:
                return 'VIEW'
            elif 'inspections' in path or 'shipment' in path:
                return 'VIEW'
            elif 'clients' in path:
                return 'VIEW'
            elif 'client-allocation' in path:
                return 'VIEW'
        
        # Form submissions
        elif method == 'POST':
            if 'add' in path or 'create' in path:
                return 'CREATE'
            elif 'edit' in path or 'update' in path:
                return 'UPDATE'
            elif 'delete' in path:
                return 'DELETE'
            elif 'refresh' in path:
                return 'SYNC'
            elif 'export' in path:
                return 'EXPORT'
            elif 'import' in path:
                return 'IMPORT'
            elif 'upload' in path:
                return 'FILE_UPLOAD'
            elif 'search' in path or 'filter' in path:
                return 'SEARCH'
        
        return None
    
    def _get_description(self, request, action):
        """Generate a description for the logged action"""
        path = request.path
        method = request.method
        
        if action == 'LOGIN':
            return f"User logged in via {path}"
        elif action == 'LOGOUT':
            return f"User logged out via {path}"
        elif action == 'NAVIGATE':
            return f"Navigated to {path}"
        elif action == 'VIEW':
            return f"Viewed {path}"
        elif action == 'CREATE':
            return f"Created new record via {path}"
        elif action == 'UPDATE':
            return f"Updated record via {path}"
        elif action == 'DELETE':
            return f"Deleted record via {path}"
        elif action == 'SYNC':
            return f"Data synchronization via {path}"
        elif action == 'EXPORT':
            return f"Data export via {path}"
        elif action == 'IMPORT':
            return f"Data import via {path}"
        elif action == 'FILE_UPLOAD':
            return f"File upload via {path}"
        elif action == 'SEARCH':
            return f"Search/filter operation via {path}"
        else:
            return f"{method} request to {path}"
