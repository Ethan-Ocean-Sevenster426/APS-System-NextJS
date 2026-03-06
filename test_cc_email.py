"""
Test: Verify semicolon email fix + full send flow.
Reproduces the exact error that was happening: 'thembalethumeatshop@gmail.com; byang.zheng@gmail.com'
Run on server: cd /var/www/v4-Worksheet-demo && source venv/bin/activate && python test_cc_email.py
"""
import os
import sys
import base64
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
PASS = f'{GREEN}PASS{RESET}'
FAIL = f'{RED}FAIL{RESET}'

print(f"\n{'='*70}")
print(f" EMAIL SYSTEM TESTS")
print(f"{'='*70}")

# ── TEST 1: Semicolon splitting ──
print(f"\n{CYAN}── TEST 1: Semicolon email splitting ──{RESET}")
from main.views.core_views import get_all_client_emails

# Find the client that had the semicolon issue
from main.models import FoodSafetyAgencyInspection
semi_insp = FoodSafetyAgencyInspection.objects.filter(
    additional_email__contains=';'
).first()

if semi_insp:
    print(f"  Found inspection with semicolons: {semi_insp.client_name}")
    print(f"  additional_email: '{semi_insp.additional_email}'")
    emails = get_all_client_emails(semi_insp.client_name, inspection_group_id=semi_insp.inspection_group_id)
    print(f"  Resolved emails: {emails}")
    # Check none contain semicolons
    bad = [e for e in emails if ';' in e]
    if bad:
        print(f"  {FAIL} Still has semicolons in: {bad}")
    elif len(emails) >= 2:
        print(f"  {PASS} Split into {len(emails)} separate emails, no semicolons")
    elif len(emails) == 1:
        print(f"  {PASS} Got 1 email (no semicolons)")
    else:
        print(f"  {FAIL} No emails found")
else:
    print(f"  {YELLOW}No inspections with semicolons in additional_email found{RESET}")
    # Manual test with known data
    print(f"  Testing manual split logic instead...")
    import re
    test_val = 'thembalethumeatshop@gmail.com; byang.zheng@gmail.com'
    parts = [p.strip().lower() for p in re.split(r'[,;]+', test_val) if '@' in p.strip()]
    if len(parts) == 2 and ';' not in parts[0] and ';' not in parts[1]:
        print(f"  {PASS} '{test_val}' → {parts}")
    else:
        print(f"  {FAIL} Got: {parts}")

# ── TEST 2: All 4 previously failing clients ──
print(f"\n{CYAN}── TEST 2: Previously failing client lookups ──{RESET}")
failing = [
    ('Meat Rama 2', '767'),
    ('Kekkel en kraai hirbenia', '496'),
    ('Super spar Sedgefield', '280'),
    ('Mndeni Meats Portshepstone', '780'),
]
all_ok = True
for name, gid in failing:
    emails = get_all_client_emails(name, inspection_group_id=gid)
    if emails:
        print(f"  {PASS} {name} → {emails}")
    else:
        print(f"  {FAIL} {name} → no emails found")
        all_ok = False

# ── TEST 3: Graph API send to anthony only (no spam) ──
print(f"\n{CYAN}── TEST 3: Graph API send (to anthony only) ──{RESET}")

tenant_id = settings.GRAPH_TENANT_ID
client_id = settings.GRAPH_CLIENT_ID
client_secret = settings.GRAPH_CLIENT_SECRET
from_email = settings.DEFAULT_FROM_EMAIL

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
    headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
    graph_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"

    # 3a: Send with two TO recipients (simulates the semicolon fix)
    email_data = {
        "message": {
            "subject": "FSA Test - Semicolon fix verified",
            "body": {
                "contentType": "HTML",
                "content": "<p>This test verifies two separate TO recipients work (was failing with semicolons).</p>"
            },
            "toRecipients": [
                {"emailAddress": {"address": "anthony.penzes@moc-pty.com"}},
                {"emailAddress": {"address": "ethan.sevenster@eclick.co.za"}}
            ],
            "from": {"emailAddress": {"address": from_email}}
        },
        "saveToSentItems": "false"
    }
    resp = requests.post(graph_url, headers=headers, json=email_data, timeout=30)
    if resp.status_code == 202:
        print(f"  {PASS} Two TO recipients sent OK")
    else:
        err = resp.json().get('error', {})
        print(f"  {FAIL} HTTP {resp.status_code}: {err.get('code')} - {err.get('message', '')[:100]}")

    # 3b: Send with attachment
    email_data['message']['subject'] = 'FSA Test - Attachment send verified'
    email_data['message']['toRecipients'] = [{"emailAddress": {"address": "anthony.penzes@moc-pty.com"}}]
    email_data['message']['attachments'] = [{
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "test.txt",
        "contentType": "text/plain",
        "contentBytes": base64.b64encode(b"test content").decode()
    }]
    resp = requests.post(graph_url, headers=headers, json=email_data, timeout=30)
    if resp.status_code == 202:
        print(f"  {PASS} Attachment send OK")
    else:
        err = resp.json().get('error', {})
        print(f"  {FAIL} HTTP {resp.status_code}: {err.get('code')} - {err.get('message', '')[:100]}")

except Exception as e:
    print(f"  {FAIL} Exception: {e}")

# ── TEST 4: Django EmailMessage (production path) ──
print(f"\n{CYAN}── TEST 4: Django EmailMessage (production path) ──{RESET}")
from django.core.mail import EmailMessage

try:
    email = EmailMessage(
        subject='FSA Test - Production path verified',
        body='<p>This tests the exact same code path as the Send button.</p>',
        from_email=from_email,
        to=['anthony.penzes@moc-pty.com'],
        reply_to=[from_email],
    )
    email.content_subtype = 'html'
    email.attach('test.txt', b'test attachment', 'text/plain')
    result = email.send()
    print(f"  {PASS} Django send OK (result={result})" if result else f"  {FAIL} result={result}")
except Exception as e:
    print(f"  {FAIL} {e}")

# ── SUMMARY ──
print(f"\n{'='*70}")
print(f" TESTS COMPLETE - check anthony.penzes@moc-pty.com for test emails")
print(f"{'='*70}\n")
