"""
Debug script to diagnose why the Send button doesn't work on inspection_records page.
Run on server: cd /var/inspection-system && source venv/bin/activate && python3 debug.py
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
RESET = '\033[0m'

def ok(msg):
    print(f"  {GREEN}OK{RESET}   {msg}")

def fail(msg):
    print(f"  {RED}FAIL{RESET} {msg}")

def warn(msg):
    print(f"  {YELLOW}WARN{RESET} {msg}")

def info(msg):
    print(f"  {CYAN}INFO{RESET} {msg}")


# =========================================================================
# 1. CHECK STATIC FILES
# =========================================================================
print(f"\n{'='*60}")
print(f" 1. STATIC FILES CHECK")
print(f"{'='*60}")

# Check source JS file
src_js = os.path.join(os.path.dirname(__file__), 'static', 'inspection_records', 'js', 'sent_status.js')
if os.path.exists(src_js):
    with open(src_js, 'r') as f:
        content = f.read()
    ok(f"Source JS exists: {src_js}")
    if 'Sent status JS loaded' in content:
        ok("Source JS has debug logging")
    else:
        fail("Source JS is MISSING debug logging - old version!")
    if 'toggleSentStatus' in content:
        ok("Source JS has toggleSentStatus function")
    else:
        fail("Source JS is MISSING toggleSentStatus!")
    info(f"First 100 chars: {content[:100]}")
else:
    fail(f"Source JS NOT FOUND: {src_js}")

# Check collected static JS file
collected_js = os.path.join(os.path.dirname(__file__), 'staticfiles', 'inspection_records', 'js', 'sent_status.js')
if os.path.exists(collected_js):
    with open(collected_js, 'r') as f:
        content = f.read()
    ok(f"Collected JS exists: {collected_js}")
    if 'Sent status JS loaded' in content:
        ok("Collected JS has debug logging")
    else:
        fail("Collected JS is MISSING debug logging - collectstatic needed!")
    if 'toggleSentStatus' in content:
        ok("Collected JS has toggleSentStatus function")
    else:
        fail("Collected JS is MISSING toggleSentStatus!")
    info(f"First 100 chars: {content[:100]}")

    # Compare source vs collected
    with open(src_js, 'r') as f:
        src_content = f.read()
    if src_content == content:
        ok("Source and collected JS are IDENTICAL")
    else:
        fail("Source and collected JS are DIFFERENT - run collectstatic!")
else:
    fail(f"Collected JS NOT FOUND: {collected_js} - run collectstatic!")

# Check template for script tag
print(f"\n{'='*60}")
print(f" 2. TEMPLATE CHECK")
print(f"{'='*60}")

template_path = os.path.join(os.path.dirname(__file__), 'main', 'templates', 'main', 'inspection_records.html')
if os.path.exists(template_path):
    with open(template_path, 'r') as f:
        template = f.read()
    ok(f"Template exists")

    if 'sent_status.js' in template:
        # Find the script tag line
        for i, line in enumerate(template.split('\n'), 1):
            if 'sent_status.js' in line:
                info(f"Script tag at line {i}: {line.strip()}")
    else:
        fail("Template does NOT include sent_status.js!")

    # Check for onclick handler
    if 'toggleSentStatus' in template:
        count = template.count('toggleSentStatus')
        ok(f"Template references toggleSentStatus {count} time(s)")
    else:
        fail("Template does NOT reference toggleSentStatus!")

    # Check CSRF token setup
    if 'window.DJANGO_CSRF' in template:
        ok("Template sets window.DJANGO_CSRF")
    else:
        warn("Template does NOT set window.DJANGO_CSRF")

    if 'csrfmiddlewaretoken' in template:
        ok("Template has csrfmiddlewaretoken hidden input")
    else:
        warn("Template missing csrfmiddlewaretoken hidden input")
else:
    fail(f"Template NOT FOUND: {template_path}")


# =========================================================================
# 3. DJANGO SETUP & URL CHECK
# =========================================================================
print(f"\n{'='*60}")
print(f" 3. DJANGO URL & VIEW CHECK")
print(f"{'='*60}")

try:
    import django
    django.setup()
    ok("Django setup successful")
except Exception as e:
    fail(f"Django setup failed: {e}")
    sys.exit(1)

from django.urls import reverse, resolve
from django.conf import settings

# Check if the send-documents URL exists
try:
    url = reverse('send_group_documents')
    ok(f"URL 'send_group_documents' resolves to: {url}")
except Exception:
    try:
        url = reverse('send-documents')
        ok(f"URL 'send-documents' resolves to: {url}")
    except Exception:
        warn("Could not reverse 'send_group_documents' or 'send-documents' by name")
        # Try to find it manually
        from django.urls import get_resolver
        resolver = get_resolver()
        found = False
        for pattern in resolver.url_patterns:
            if hasattr(pattern, 'url_patterns'):
                for sub in pattern.url_patterns:
                    pat_str = str(sub.pattern)
                    if 'send' in pat_str.lower() and 'document' in pat_str.lower():
                        info(f"Found URL pattern: {pat_str} -> {sub.callback}")
                        found = True
            else:
                pat_str = str(pattern.pattern)
                if 'send' in pat_str.lower():
                    info(f"Found URL pattern: {pat_str} -> {pattern.callback}")
                    found = True
        if not found:
            fail("No send-documents URL pattern found!")

# Try resolving the actual URL path
try:
    match = resolve('/inspections/send-documents/')
    ok(f"Path '/inspections/send-documents/' resolves to: {match.func.__name__}")
except Exception as e:
    fail(f"Path '/inspections/send-documents/' does NOT resolve: {e}")
    # Try without trailing slash
    try:
        match = resolve('/inspections/send-documents')
        ok(f"Path '/inspections/send-documents' (no slash) resolves to: {match.func.__name__}")
    except Exception as e2:
        fail(f"Path '/inspections/send-documents' also fails: {e2}")
    # List all inspection URLs
    info("Listing all URLs containing 'inspect' or 'send':")
    from django.urls import get_resolver
    resolver = get_resolver()
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'url_patterns'):
            prefix = str(pattern.pattern)
            for sub in pattern.url_patterns:
                full = prefix + str(sub.pattern)
                if 'inspect' in full.lower() or 'send' in full.lower():
                    info(f"  {full}")
        else:
            pat_str = str(pattern.pattern)
            if 'inspect' in pat_str.lower() or 'send' in pat_str.lower():
                info(f"  {pat_str}")


# =========================================================================
# 4. EMAIL BACKEND CHECK
# =========================================================================
print(f"\n{'='*60}")
print(f" 4. EMAIL BACKEND CHECK")
print(f"{'='*60}")

info(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")

graph_id = getattr(settings, 'GRAPH_CLIENT_ID', None)
graph_secret = getattr(settings, 'GRAPH_CLIENT_SECRET', None)
graph_tenant = getattr(settings, 'GRAPH_TENANT_ID', None)

if graph_id:
    ok(f"GRAPH_CLIENT_ID set: {graph_id[:8]}...")
else:
    fail("GRAPH_CLIENT_ID not set!")

if graph_secret:
    ok(f"GRAPH_CLIENT_SECRET set: {graph_secret[:8]}...")
else:
    fail("GRAPH_CLIENT_SECRET not set!")

if graph_tenant:
    ok(f"GRAPH_TENANT_ID set: {graph_tenant[:8]}...")
else:
    fail("GRAPH_TENANT_ID not set!")

# Test token acquisition
if all([graph_id, graph_secret, graph_tenant]):
    info("Testing Graph API token acquisition...")
    try:
        import requests
        token_url = f"https://login.microsoftonline.com/{graph_tenant}/oauth2/v2.0/token"
        token_data = {
            'grant_type': 'client_credentials',
            'client_id': graph_id,
            'client_secret': graph_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }
        response = requests.post(token_url, data=token_data, timeout=15)
        if response.status_code == 200:
            ok("Graph API token acquired successfully")
        else:
            fail(f"Graph API token failed: {response.status_code} - {response.text[:200]}")
    except Exception as e:
        fail(f"Graph API token request error: {e}")


# =========================================================================
# 5. STATIC FILES SETTINGS
# =========================================================================
print(f"\n{'='*60}")
print(f" 5. STATIC FILES SETTINGS")
print(f"{'='*60}")

info(f"STATIC_URL: {settings.STATIC_URL}")
info(f"STATIC_ROOT: {settings.STATIC_ROOT}")
info(f"STATICFILES_DIRS: {getattr(settings, 'STATICFILES_DIRS', 'NOT SET')}")
info(f"DEBUG: {settings.DEBUG}")

# Check if nginx might be serving stale files
nginx_conf_paths = ['/etc/nginx/sites-enabled/default', '/etc/nginx/sites-enabled/inspection-system',
                     '/etc/nginx/conf.d/default.conf', '/etc/nginx/nginx.conf']
print(f"\n{'='*60}")
print(f" 6. NGINX CONFIG CHECK")
print(f"{'='*60}")

for conf_path in nginx_conf_paths:
    if os.path.exists(conf_path):
        with open(conf_path, 'r') as f:
            nginx_content = f.read()
        info(f"Found nginx config: {conf_path}")
        # Look for static file serving and caching
        for i, line in enumerate(nginx_content.split('\n'), 1):
            stripped = line.strip()
            if any(kw in stripped.lower() for kw in ['static', 'expires', 'cache', 'location', 'alias', 'root']):
                if stripped and not stripped.startswith('#'):
                    info(f"  Line {i}: {stripped}")


# =========================================================================
# 7. TEST get_client_email FUNCTION
# =========================================================================
print(f"\n{'='*60}")
print(f" 7. get_client_email FUNCTION CHECK")
print(f"{'='*60}")

try:
    from main.views.core_views import get_client_email
    ok("get_client_email imported successfully")

    # Test with a known client
    from main.models import Client
    first_client = Client.objects.first()
    if first_client:
        name = first_client.name or first_client.client_id
        info(f"Testing with first client: '{name}'")
        email = get_client_email(name)
        if email:
            ok(f"get_client_email('{name}') = '{email}'")
        else:
            warn(f"get_client_email('{name}') returned None (client may have no email)")
except Exception as e:
    fail(f"get_client_email error: {e}")


# =========================================================================
# 8. CHECK send_group_documents VIEW
# =========================================================================
print(f"\n{'='*60}")
print(f" 8. send_group_documents VIEW CHECK")
print(f"{'='*60}")

try:
    from main.views.core_views import send_group_documents
    ok("send_group_documents view imported successfully")

    # Check it accepts POST
    import inspect
    source = inspect.getsource(send_group_documents)
    if 'require_POST' in source or 'request.method' in source or 'POST' in source:
        ok("View handles POST requests")
    if 'get_client_email' in source:
        ok("View calls get_client_email")
    if 'inspection_group_id' in source:
        ok("View uses inspection_group_id parameter")
    if 'JsonResponse' in source:
        ok("View returns JsonResponse")
    info(f"View source length: {len(source)} chars")
except Exception as e:
    fail(f"send_group_documents error: {e}")


# =========================================================================
# SUMMARY
# =========================================================================
print(f"\n{'='*60}")
print(f" DONE - Review results above for any FAIL items")
print(f"{'='*60}\n")
