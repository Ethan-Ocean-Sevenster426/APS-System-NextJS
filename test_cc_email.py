"""
Test: Multiple methods to deliver email to Simphiwe from shared inbox only.
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

SHARED = 'foodsafetyagency.aps@afsq.co.za'
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

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}
graph_url = f"https://graph.microsoft.com/v1.0/users/{SHARED}/sendMail"


def send_test(test_num, subject, body_type, body_content, use_bcc=False, importance="Normal"):
    print(f"\n  {CYAN}TEST {test_num}:{RESET} {subject}")
    print(f"    FROM: {SHARED} → TO: {TARGET} | {body_type} | Importance: {importance} | BCC: {use_bcc}")

    email_data = {
        "message": {
            "subject": subject,
            "body": {"contentType": body_type, "content": body_content},
            "importance": importance,
            "from": {"emailAddress": {"address": SHARED}}
        },
        "saveToSentItems": "true"
    }

    if use_bcc:
        email_data["message"]["bccRecipients"] = [{"emailAddress": {"address": TARGET}}]
        email_data["message"]["toRecipients"] = [{"emailAddress": {"address": SHARED}}]
    else:
        email_data["message"]["toRecipients"] = [{"emailAddress": {"address": TARGET}}]

    try:
        resp = requests.post(graph_url, headers=headers, json=email_data, timeout=30)
        if resp.status_code == 202:
            print(f"    {GREEN}SENT{RESET} (HTTP 202)")
        else:
            print(f"    {RED}FAILED{RESET} HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"    {RED}ERROR{RESET} {e}")


print(f"\n{'='*60}")
print(f" SHARED INBOX TESTS → {TARGET}")
print(f" FROM: {SHARED}")
print(f"{'='*60}")
print(f"  {GREEN}Token obtained{RESET}")

# Test 1: Plain text TO
send_test(1, 'Simphiwe Test 1 - Plain text TO', 'Text',
    'Good day Simphiwe, plain text test from the shared inbox. Kind Regards, FSA.')
time.sleep(2)

# Test 2: HTML TO with high importance
send_test(2, 'Simphiwe Test 2 - HTML high importance TO', 'HTML',
    '<p>Good day Simphiwe, HTML test with HIGH importance from the shared inbox.</p>',
    importance="High")
time.sleep(2)

# Test 3: Plain text BCC
send_test(3, 'Simphiwe Test 3 - Plain text BCC', 'Text',
    'Good day Simphiwe, BCC delivery test from the shared inbox.',
    use_bcc=True)
time.sleep(2)

# Test 4: HTML BCC with high importance
send_test(4, 'Simphiwe Test 4 - HTML BCC high importance', 'HTML',
    '<p>Good day Simphiwe, HTML BCC test with HIGH importance from the shared inbox.</p>',
    use_bcc=True, importance="High")

print(f"\n{'='*60}")
print(f"  {YELLOW}4 tests sent (all from shared inbox only).{RESET}")
print(f"  {YELLOW}Ask Simphiwe to check: Inbox, Junk, Spam, Clutter, Quarantine{RESET}")
print(f"{'='*60}\n")
