"""
Multi-method test: Try every approach to deliver email to simphiwe.mathenjwa@afsq.co.za
Run on server: cd /var/www/v4-Worksheet-demo && source venv/bin/activate && python test_cc_email.py
"""
import os
import sys
import time
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

TARGET = 'simphiwe.mathenjwa@afsq.co.za'

tenant_id = settings.GRAPH_TENANT_ID
client_id = settings.GRAPH_CLIENT_ID
client_secret = settings.GRAPH_CLIENT_SECRET

# Get token
token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
token_data = {
    'grant_type': 'client_credentials',
    'client_id': client_id,
    'client_secret': client_secret,
    'scope': 'https://graph.microsoft.com/.default'
}
token_resp = requests.post(token_url, data=token_data, timeout=30)
token_resp.raise_for_status()
access_token = token_resp.json()['access_token']


def send_test(test_num, from_addr, to_addr, subject, body_type, body_content, use_bcc=False, importance="Normal"):
    """Send a single test email via Graph API."""
    print(f"\n  {CYAN}TEST {test_num}:{RESET} {subject}")
    print(f"    FROM: {from_addr} | TO: {to_addr} | Type: {body_type} | Importance: {importance}")
    if use_bcc:
        print(f"    (Using BCC instead of TO)")

    email_data = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": body_type,
                "content": body_content
            },
            "importance": importance,
            "from": {
                "emailAddress": {"address": from_addr}
            }
        },
        "saveToSentItems": "true"
    }

    if use_bcc:
        email_data["message"]["bccRecipients"] = [{"emailAddress": {"address": to_addr}}]
        email_data["message"]["toRecipients"] = [{"emailAddress": {"address": from_addr}}]
    else:
        email_data["message"]["toRecipients"] = [{"emailAddress": {"address": to_addr}}]

    graph_url = f"https://graph.microsoft.com/v1.0/users/{from_addr}/sendMail"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    try:
        resp = requests.post(graph_url, headers=headers, json=email_data, timeout=30)
        if resp.status_code == 202:
            print(f"    {GREEN}SENT{RESET} (HTTP 202)")
            return True
        else:
            print(f"    {RED}FAILED{RESET} HTTP {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"    {RED}ERROR{RESET} {e}")
        return False


print(f"\n{'='*60}")
print(f" MULTI-METHOD EMAIL TEST → {TARGET}")
print(f"{'='*60}")
print(f"  {GREEN}Token obtained{RESET}")

# ── Test 1: Shared inbox → Simphiwe (plain text, not HTML)
send_test(1,
    'foodsafetyagency.aps@afsq.co.za', TARGET,
    'Test 1 - Plain text from shared inbox',
    'Text',
    'Good day Simphiwe, this is a plain text test from the shared inbox. If you see this, plain text emails work. Kind Regards, FSA System.'
)
time.sleep(2)

# ── Test 2: Shared inbox → Simphiwe (HTML, high importance)
send_test(2,
    'foodsafetyagency.aps@afsq.co.za', TARGET,
    'Test 2 - HTML high importance from shared inbox',
    'HTML',
    '<p>Good day Simphiwe, this is an HTML test with HIGH importance from the shared inbox.</p>',
    importance="High"
)
time.sleep(2)

# ── Test 3: Anthony fsa-pty → Simphiwe (plain text)
send_test(3,
    'anthony.penzes@fsa-pty.co.za', TARGET,
    'Test 3 - Plain text from Anthony fsa-pty',
    'Text',
    'Good day Simphiwe, this is a plain text test from anthony.penzes@fsa-pty.co.za. Kind Regards, Anthony.'
)
time.sleep(2)

# ── Test 4: Anthony afsq → Simphiwe (plain text)
send_test(4,
    'anthony.penzes@afsq.co.za', TARGET,
    'Test 4 - Plain text from Anthony afsq',
    'Text',
    'Good day Simphiwe, this is a plain text test from anthony.penzes@afsq.co.za. Kind Regards, Anthony.'
)
time.sleep(2)

# ── Test 5: Shared inbox → Simphiwe via BCC (hidden recipient)
send_test(5,
    'foodsafetyagency.aps@afsq.co.za', TARGET,
    'Test 5 - BCC from shared inbox',
    'Text',
    'Good day, this is a BCC delivery test from the shared inbox.',
    use_bcc=True
)
time.sleep(2)

# ── Test 6: Anthony fsa-pty → Simphiwe via BCC
send_test(6,
    'anthony.penzes@fsa-pty.co.za', TARGET,
    'Test 6 - BCC from Anthony fsa-pty',
    'Text',
    'Good day Simphiwe, this is a BCC delivery test from anthony.penzes@fsa-pty.co.za.',
    use_bcc=True
)

print(f"\n{'='*60}")
print(f"  {YELLOW}6 tests sent. Ask Simphiwe to check:{RESET}")
print(f"    1. Inbox")
print(f"    2. Junk/Spam folder")
print(f"    3. Quarantine (admin may need to check)")
print(f"    4. Clutter folder")
print(f"{'='*60}\n")
