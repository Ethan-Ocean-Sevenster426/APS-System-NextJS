"""
Test: Send email directly from anthony.penzes@fsa-pty.co.za to simphiwe.
No shared inbox - uses Anthony's Graph API account directly.
Run on server: cd /var/www/v4-Worksheet-demo && source venv/bin/activate && python test_cc_email.py
"""
import os
import sys
import json
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from django.conf import settings

GREEN = '\033[92m'
RED = '\033[91m'
CYAN = '\033[96m'
YELLOW = '\033[93m'
RESET = '\033[0m'

# Direct send from Anthony's account to Simphiwe
from_email = 'anthony.penzes@fsa-pty.co.za'
to_email = 'simphiwe.mathenjwa@afsq.co.za'

print(f"\n{'='*60}")
print(f" TEST: Direct email from Anthony to Simphiwe")
print(f"{'='*60}")
print(f"  {CYAN}FROM:{RESET} {from_email}")
print(f"  {CYAN}TO:{RESET} {to_email}")

# Get Graph API token
tenant_id = settings.GRAPH_TENANT_ID
client_id = settings.GRAPH_CLIENT_ID
client_secret = settings.GRAPH_CLIENT_SECRET

print(f"  {CYAN}TENANT_ID:{RESET} {tenant_id[:8]}...")

token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_data = {
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': 'https://graph.microsoft.com/.default'
}

try:
    token_resp = requests.post(token_url, data=token_data, timeout=30)
    token_resp.raise_for_status()
    access_token = token_resp.json()['access_token']
    print(f"  {GREEN}Token obtained{RESET}")

    # Build email payload - send directly from Anthony's mailbox
    email_data = {
        "message": {
            "subject": "FSA Test v4 - Direct from Anthony to Simphiwe",
            "body": {
                "contentType": "HTML",
                "content": """
<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Good day Simphiwe,</p>
    <p>This is a <strong>direct test email</strong> sent from anthony.penzes@fsa-pty.co.za to your inbox.</p>
    <p>No shared inbox involved - this is sent directly via Anthony's Graph API account.</p>
    <p>If you received this, your mailbox accepts emails from this sender.</p>
    <p>Kind Regards,<br>FSA System Test</p>
</div>
"""
            },
            "toRecipients": [
                {"emailAddress": {"address": to_email}}
            ],
            "from": {
                "emailAddress": {"address": from_email}
            }
        },
        "saveToSentItems": "true"
    }

    # Send via Graph API using Anthony's mailbox
    graph_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    print(f"\n  Sending from {from_email} to {to_email}...")
    resp = requests.post(graph_url, headers=headers, json=email_data, timeout=30)

    if resp.status_code == 202:
        print(f"  {GREEN}SUCCESS{RESET} Email sent! (HTTP {resp.status_code})")
        print(f"\n  {YELLOW}Ask Simphiwe to check inbox + junk folder{RESET}")
    else:
        print(f"  {RED}FAILED{RESET} HTTP {resp.status_code}")
        print(f"  Response: {resp.text}")

except Exception as e:
    import traceback
    print(f"  {RED}ERROR{RESET} {e}")
    traceback.print_exc()

print(f"\n{'='*60}\n")
