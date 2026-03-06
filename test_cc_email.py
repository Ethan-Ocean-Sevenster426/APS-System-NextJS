"""
Test: Full email send simulation for failing clients.
Tests email lookup AND actual Graph API send with detailed error output.
Run on server: cd /var/www/v4-Worksheet-demo && source venv/bin/activate && python test_cc_email.py
"""
import os
import sys
import json
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

print(f"\n{'='*70}")
print(f" FULL EMAIL SEND DIAGNOSTIC TEST")
print(f"{'='*70}")

# ── PART 1: Test email lookup for failing clients ──
print(f"\n{CYAN}── PART 1: Email Lookup Tests ──{RESET}")

from main.views.core_views import get_all_client_emails, get_client_email

failing_clients = [
    ('Meat Rama 2', '767'),
    ('Kekkel en kraai hirbenia', '496'),
    ('Super spar Sedgefield', '280'),
    ('Mndeni Meats Portshepstone', '780'),
]

all_lookups_ok = True
for client_name, group_id in failing_clients:
    all_emails = get_all_client_emails(client_name, inspection_group_id=group_id)
    single_email = get_client_email(client_name, inspection_group_id=group_id)
    
    if all_emails:
        print(f"  {GREEN}OK{RESET} {client_name} (group {group_id})")
        print(f"       get_all_client_emails: {all_emails}")
        print(f"       get_client_email:      {single_email}")
    else:
        all_lookups_ok = False
        print(f"  {RED}FAIL{RESET} {client_name} (group {group_id})")
        print(f"       get_all_client_emails: [] (empty!)")
        print(f"       get_client_email:      {single_email}")
        
        # Debug: check what's in the DB
        from main.models import Client, FoodSafetyAgencyInspection, InspectionGroup
        insp = FoodSafetyAgencyInspection.objects.filter(inspection_group_id=group_id).first()
        if insp:
            print(f"       Inspection: client_name='{insp.client_name}', client_fk={insp.client_id}, additional_email='{insp.additional_email}'")
        group = InspectionGroup.objects.filter(id=group_id).first()
        if group:
            print(f"       Group: client_name='{group.client_name}', client_fk={group.client_id}, additional_email='{group.additional_email}'")

if all_lookups_ok:
    print(f"\n  {GREEN}All email lookups succeeded!{RESET}")
else:
    print(f"\n  {RED}Some email lookups failed - see above{RESET}")

# ── PART 2: Test Graph API send ──
print(f"\n{CYAN}── PART 2: Graph API Send Test ──{RESET}")

tenant_id = settings.GRAPH_TENANT_ID
client_id = settings.GRAPH_CLIENT_ID
client_secret = settings.GRAPH_CLIENT_SECRET
from_email = settings.DEFAULT_FROM_EMAIL

print(f"  FROM: {from_email}")
print(f"  TENANT: {tenant_id[:8]}...")

# Get token
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
except Exception as e:
    print(f"  {RED}Token FAILED: {e}{RESET}")
    sys.exit(1)

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}
graph_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"

# Test 2a: Simple send (no attachments) to first failing client's emails
test_client = failing_clients[0]
test_emails = get_all_client_emails(test_client[0], inspection_group_id=test_client[1])
if not test_emails:
    test_emails = ['anthony.penzes@moc-pty.com']

print(f"\n  {CYAN}Test 2a: Simple send (no attachments){RESET}")
print(f"    TO: {test_emails}")

email_data_simple = {
    "message": {
        "subject": f"FSA Test - Email lookup + send for {test_client[0]}",
        "body": {
            "contentType": "HTML",
            "content": f"<p>Test email for client: {test_client[0]}</p><p>This is a no-attachment test to verify the Graph API send works.</p>"
        },
        "toRecipients": [
            {"emailAddress": {"address": addr}} for addr in test_emails
        ],
        "from": {"emailAddress": {"address": from_email}}
    },
    "saveToSentItems": "false"
}

try:
    resp = requests.post(graph_url, headers=headers, json=email_data_simple, timeout=30)
    if resp.status_code == 202:
        print(f"    {GREEN}SENT OK{RESET} (HTTP 202)")
    else:
        print(f"    {RED}FAILED{RESET} HTTP {resp.status_code}")
        print(f"    Response body: {resp.text[:500]}")
        try:
            err = resp.json()
            print(f"    Error code: {err.get('error', {}).get('code', 'N/A')}")
            print(f"    Error msg:  {err.get('error', {}).get('message', 'N/A')}")
        except:
            pass
except Exception as e:
    print(f"    {RED}EXCEPTION: {e}{RESET}")

# Test 2b: Send with a small dummy attachment
print(f"\n  {CYAN}Test 2b: Send with small dummy attachment{RESET}")

dummy_content = b"This is a test attachment content for FSA email testing."
email_data_attach = {
    "message": {
        "subject": f"FSA Test - With attachment for {test_client[0]}",
        "body": {
            "contentType": "HTML",
            "content": f"<p>Test email with attachment for client: {test_client[0]}</p>"
        },
        "toRecipients": [
            {"emailAddress": {"address": "anthony.penzes@moc-pty.com"}}
        ],
        "from": {"emailAddress": {"address": from_email}},
        "attachments": [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": "test_document.txt",
                "contentType": "text/plain",
                "contentBytes": base64.b64encode(dummy_content).decode('utf-8')
            }
        ]
    },
    "saveToSentItems": "false"
}

try:
    resp = requests.post(graph_url, headers=headers, json=email_data_attach, timeout=30)
    if resp.status_code == 202:
        print(f"    {GREEN}SENT OK{RESET} (HTTP 202)")
    else:
        print(f"    {RED}FAILED{RESET} HTTP {resp.status_code}")
        print(f"    Response body: {resp.text[:500]}")
        try:
            err = resp.json()
            print(f"    Error code: {err.get('error', {}).get('code', 'N/A')}")
            print(f"    Error msg:  {err.get('error', {}).get('message', 'N/A')}")
        except:
            pass
except Exception as e:
    print(f"    {RED}EXCEPTION: {e}{RESET}")

# Test 2c: Send with CC (inspector + manager)
print(f"\n  {CYAN}Test 2c: Send with CC (manager){RESET}")
cc_list = ['simphiwe.mathenjwa@afsq.co.za']

email_data_cc = {
    "message": {
        "subject": f"FSA Test - CC test for {test_client[0]}",
        "body": {
            "contentType": "HTML",
            "content": f"<p>Test CC email for client: {test_client[0]}</p>"
        },
        "toRecipients": [
            {"emailAddress": {"address": "anthony.penzes@moc-pty.com"}}
        ],
        "ccRecipients": [
            {"emailAddress": {"address": cc}} for cc in cc_list
        ],
        "from": {"emailAddress": {"address": from_email}}
    },
    "saveToSentItems": "false"
}

try:
    resp = requests.post(graph_url, headers=headers, json=email_data_cc, timeout=30)
    if resp.status_code == 202:
        print(f"    {GREEN}SENT OK{RESET} (HTTP 202)")
    else:
        print(f"    {RED}FAILED{RESET} HTTP {resp.status_code}")
        print(f"    Response body: {resp.text[:500]}")
        try:
            err = resp.json()
            print(f"    Error code: {err.get('error', {}).get('code', 'N/A')}")
            print(f"    Error msg:  {err.get('error', {}).get('message', 'N/A')}")
        except:
            pass
except Exception as e:
    print(f"    {RED}EXCEPTION: {e}{RESET}")

# ── PART 3: Test Django EmailMessage (same path as actual send) ──
print(f"\n{CYAN}── PART 3: Django EmailMessage Send (same as production) ──{RESET}")
from django.core.mail import EmailMessage

try:
    email = EmailMessage(
        subject=f'FSA Test - Django EmailMessage for {test_client[0]}',
        body=f'<p>Test via Django EmailMessage backend for client: {test_client[0]}</p>',
        from_email=from_email,
        to=['anthony.penzes@moc-pty.com'],
        cc=['simphiwe.mathenjwa@afsq.co.za'],
        reply_to=[from_email],
    )
    email.content_subtype = 'html'
    
    print(f"    TO: {email.to}")
    print(f"    CC: {email.cc}")
    print(f"    FROM: {email.from_email}")
    
    result = email.send()
    if result:
        print(f"    {GREEN}SENT OK{RESET} (result={result})")
    else:
        print(f"    {RED}FAILED{RESET} (result={result})")
except Exception as e:
    import traceback
    print(f"    {RED}EXCEPTION: {e}{RESET}")
    traceback.print_exc()

# ── PART 4: Test Django EmailMessage with attachment (simulates actual send) ──
print(f"\n{CYAN}── PART 4: Django EmailMessage with attachment ──{RESET}")

try:
    email = EmailMessage(
        subject=f'FSA Test - With attachment via Django for {test_client[0]}',
        body=f'<p>Test with attachment via Django EmailMessage backend</p>',
        from_email=from_email,
        to=['anthony.penzes@moc-pty.com'],
        reply_to=[from_email],
    )
    email.content_subtype = 'html'
    email.attach('test_doc.txt', b'Test attachment content', 'text/plain')
    
    print(f"    TO: {email.to}")
    print(f"    Attachments: {len(email.attachments)}")
    
    result = email.send()
    if result:
        print(f"    {GREEN}SENT OK{RESET} (result={result})")
    else:
        print(f"    {RED}FAILED{RESET} (result={result})")
except Exception as e:
    import traceback
    print(f"    {RED}EXCEPTION: {e}{RESET}")
    traceback.print_exc()

print(f"\n{'='*70}")
print(f" {GREEN}DIAGNOSTICS COMPLETE{RESET}")
print(f"{'='*70}\n")
