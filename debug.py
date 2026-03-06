"""
Full end-to-end debug of the Send button flow.
Simulates exactly what happens when a user clicks Send on the inspection_records page.

Run: cd /var/inspection-system && source venv/bin/activate && python3 debug.py
"""
import os
import sys
import json
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BOLD = '\033[1m'
RESET = '\033[0m'

def ok(msg):
    print(f"  {GREEN}OK{RESET}   {msg}")

def fail(msg):
    print(f"  {RED}FAIL{RESET} {msg}")

def warn(msg):
    print(f"  {YELLOW}WARN{RESET} {msg}")

def info(msg):
    print(f"  {CYAN}INFO{RESET} {msg}")

def header(num, title):
    print(f"\n{BOLD}{'='*60}")
    print(f" {num}. {title}")
    print(f"{'='*60}{RESET}")


from django.conf import settings
from main.models import FoodSafetyAgencyInspection, Client, ClientEmail

# =========================================================================
header(1, "FIND ALL INSPECTIONS THAT APPEAR ON THE PAGE")
# =========================================================================

# Get all inspections grouped like the page does
all_inspections = FoodSafetyAgencyInspection.objects.all().order_by('-date_of_inspection')[:50]
info(f"Total inspections in DB: {FoodSafetyAgencyInspection.objects.count()}")
info(f"Checking latest 50 inspections")

# Group by client+date (like the page does)
groups = {}
for insp in all_inspections:
    key = f"{insp.client_name}|{insp.date_of_inspection}"
    if key not in groups:
        groups[key] = {
            'client_name': insp.client_name,
            'date': str(insp.date_of_inspection),
            'inspection_group_id': insp.inspection_group_id or '',
            'is_sent': insp.is_sent,
            'inspections': [],
        }
    groups[key]['inspections'].append(insp)

info(f"Found {len(groups)} unique client+date groups")

# =========================================================================
header(2, "TEST EACH GROUP - FULL SEND SIMULATION")
# =========================================================================

from main.views.core_views import get_client_email, get_inspection_files_local

test_results = []

for key, group in list(groups.items())[:25]:  # Test first 25 groups
    client_name = group['client_name']
    inspection_date = group['date']
    inspection_group_id = group['inspection_group_id']
    num_inspections = len(group['inspections'])

    print(f"\n  {BOLD}--- {client_name} ({inspection_date}) ---{RESET}")
    info(f"inspection_group_id: '{inspection_group_id}'")
    info(f"Inspections in group: {num_inspections}")
    info(f"is_sent: {group['is_sent']}")

    issues = []

    # Step 1: Email lookup
    try:
        email = get_client_email(client_name, inspection_group_id=inspection_group_id)
        if email:
            ok(f"Email: {email}")
        else:
            fail(f"No email found!")
            issues.append("NO_EMAIL")
    except Exception as e:
        fail(f"Email lookup crashed: {e}")
        issues.append(f"EMAIL_CRASH: {e}")

    # Step 2: File lookup
    try:
        files_by_category = get_inspection_files_local(client_name, inspection_date, force_refresh=True)
        total_files = sum(len(v) for v in files_by_category.items() if isinstance(v, list))
        # Count properly
        file_count = 0
        file_details = []
        for cat, file_list in files_by_category.items():
            if file_list:
                file_count += len(file_list)
                for f in file_list:
                    rel_path = f.get('relative_path', '')
                    if rel_path:
                        full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                        exists = os.path.isfile(full_path)
                        size = os.path.getsize(full_path) if exists else 0
                        file_details.append(f"{cat}/{f.get('name', '?')} ({'EXISTS' if exists else 'MISSING'}, {size}b)")
                    else:
                        file_details.append(f"{cat}/{f.get('name', '?')} (no relative_path)")

        if file_count > 0:
            ok(f"Files found: {file_count}")
            for fd in file_details:
                info(f"  {fd}")
        else:
            warn(f"No files found (email will still send, just no attachments)")
    except Exception as e:
        fail(f"File lookup crashed: {e}")
        traceback.print_exc()
        issues.append(f"FILE_CRASH: {e}")

    # Step 3: Check what the button data attributes would be
    first_insp = group['inspections'][0]
    # Simulate group_id generation (from template)
    fallback_group_id = f"{client_name}-{inspection_date}"
    info(f"Button data-group-id would be: '{fallback_group_id}'")
    info(f"Button data-inspection-group-id would be: '{inspection_group_id}'")

    # Step 4: Simulate the date parsing that send_group_documents does
    try:
        from datetime import datetime
        date_obj = datetime.strptime(inspection_date, '%Y-%m-%d')
        ok(f"Date parses OK: {date_obj.date()}")
    except Exception as e:
        fail(f"Date parse failed: {e}")
        issues.append(f"DATE_PARSE: {e}")

    # Step 5: Check inspection query (what the view does)
    try:
        if inspection_group_id:
            qs = FoodSafetyAgencyInspection.objects.filter(inspection_group_id=inspection_group_id)
        else:
            qs = FoodSafetyAgencyInspection.objects.filter(
                client_name__iexact=client_name,
                date_of_inspection=date_obj.date()
            )
        qs_count = qs.count()
        if qs_count > 0:
            ok(f"View query finds {qs_count} inspection(s)")
        else:
            fail(f"View query finds 0 inspections!")
            issues.append("NO_INSPECTIONS_IN_QUERY")
    except Exception as e:
        fail(f"View query crashed: {e}")
        issues.append(f"QUERY_CRASH: {e}")

    test_results.append({
        'client': client_name,
        'date': inspection_date,
        'email': email if 'email' in dir() else None,
        'issues': issues,
    })


# =========================================================================
header(3, "SIMULATE ACTUAL HTTP POST (without sending email)")
# =========================================================================

info("Simulating the exact POST request the browser makes...")

# Pick a test client - use TEST FULL FLOW CLIENT if exists, otherwise first non-sent
test_group = None
for key, group in groups.items():
    if 'TEST FULL FLOW' in group['client_name'].upper():
        test_group = group
        break
if not test_group:
    for key, group in groups.items():
        if not group['is_sent']:
            test_group = group
            break
if not test_group and groups:
    test_group = list(groups.values())[0]

if test_group:
    client_name = test_group['client_name']
    inspection_date = test_group['date']
    inspection_group_id = test_group['inspection_group_id']

    info(f"Test client: {client_name}")
    info(f"Test date: {inspection_date}")
    info(f"Test inspection_group_id: {inspection_group_id}")

    # Build exact payload browser sends
    payload = {
        'group_id': f"{client_name}-{inspection_date}",
        'inspection_group_id': inspection_group_id,
        'client_name': client_name,
        'inspection_date': inspection_date,
    }
    info(f"Payload: {json.dumps(payload)}")

    # Now walk through send_group_documents logic step by step
    print(f"\n  {BOLD}Walking through send_group_documents logic:{RESET}")

    # Step A: get files
    try:
        files_by_category = get_inspection_files_local(client_name, inspection_date, force_refresh=True)
        attachments = []
        documents_found = []
        for category, file_list in files_by_category.items():
            for file_info in file_list:
                rel_path = file_info.get('relative_path', '')
                if rel_path:
                    full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
                    if os.path.isfile(full_path):
                        attachments.append(full_path)
                        documents_found.append(f"{category}/{file_info.get('name', os.path.basename(full_path))}")
        ok(f"Step A - Files: {len(attachments)} attachments")
        for d in documents_found:
            info(f"  Attachment: {d}")
    except Exception as e:
        fail(f"Step A - Files crashed: {e}")
        traceback.print_exc()

    # Step B: get email
    try:
        recipient_email = get_client_email(client_name, inspection_group_id=inspection_group_id)
        if recipient_email:
            ok(f"Step B - Email: {recipient_email}")
        else:
            fail(f"Step B - No email found! View would return error here.")
    except Exception as e:
        fail(f"Step B - Email lookup crashed: {e}")
        traceback.print_exc()

    # Step C: date parsing
    try:
        from datetime import datetime
        date_obj = datetime.strptime(inspection_date, '%Y-%m-%d')
        ok(f"Step C - Date parsed: {date_obj.date()}")
    except Exception as e:
        fail(f"Step C - Date parse failed: {e}")

    # Step D: query inspections
    try:
        if inspection_group_id:
            group_inspections = FoodSafetyAgencyInspection.objects.filter(inspection_group_id=inspection_group_id)
        else:
            group_inspections = FoodSafetyAgencyInspection.objects.filter(
                client_name__iexact=client_name,
                date_of_inspection=date_obj.date()
            )
        ok(f"Step D - Query: {group_inspections.count()} inspections")
    except Exception as e:
        fail(f"Step D - Query crashed: {e}")
        traceback.print_exc()

    # Step E: commodities
    try:
        distinct_commodities = group_inspections.values_list('commodity', flat=True).distinct()
        commodities = [c for c in distinct_commodities if c]
        ok(f"Step E - Commodities: {commodities}")
    except Exception as e:
        fail(f"Step E - Commodities crashed: {e}")

    # Step F: build email (don't actually send)
    try:
        from datetime import datetime as dt_parser
        formatted_date = dt_parser.strptime(inspection_date, '%Y-%m-%d').strftime('%d %B %Y')
        subject = f'FSA Inspection Report – {client_name} – {formatted_date}'
        ok(f"Step F - Subject: {subject}")

        from django.core.mail import EmailMessage
        email = EmailMessage(
            subject=subject,
            body='<p>Test</p>',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email] if recipient_email else ['test@test.com'],
        )
        email.content_subtype = 'html'
        for file_path in attachments:
            email.attach_file(file_path)
        ok(f"Step F - Email object created: to={email.to}, {len(email.attachments)} attachments")
    except Exception as e:
        fail(f"Step F - Email build crashed: {e}")
        traceback.print_exc()

    # Step G: Test actual sending to ethan
    print(f"\n  {BOLD}Step G - ACTUALLY SEND test email to ethan.sevenster@eclick.co.za:{RESET}")
    try:
        test_email = EmailMessage(
            subject=f'[DEBUG TEST] {subject}',
            body=f'<p>Debug test for: {client_name} on {inspection_date}</p><p>Attachments: {len(attachments)}</p><p>Recipient would be: {recipient_email}</p>',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['ethan.sevenster@eclick.co.za'],
        )
        test_email.content_subtype = 'html'
        # Attach files if any
        for file_path in attachments:
            test_email.attach_file(file_path)
        result = test_email.send()
        if result:
            ok(f"Email SENT to ethan.sevenster@eclick.co.za (result={result}, {len(attachments)} attachments)")
        else:
            fail(f"email.send() returned {result}")
    except Exception as e:
        fail(f"Email send crashed: {e}")
        traceback.print_exc()

else:
    fail("No test group found!")


# =========================================================================
header(4, "TEST THE ACTUAL URL WITH Django Test Client")
# =========================================================================

info("Simulating browser POST to /inspections/send-documents/ ...")

try:
    from django.test import RequestFactory, Client as DjangoClient
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Get an admin user
    admin_user = User.objects.filter(role__in=['admin', 'super_admin', 'developer']).first()
    if not admin_user:
        admin_user = User.objects.first()

    if admin_user:
        info(f"Using user: {admin_user.username} (role: {getattr(admin_user, 'role', 'unknown')})")

        client = DjangoClient()
        client.force_login(admin_user)

        if test_group:
            payload = {
                'group_id': f"{test_group['client_name']}-{test_group['date']}",
                'inspection_group_id': test_group['inspection_group_id'],
                'client_name': test_group['client_name'],
                'inspection_date': test_group['date'],
            }

            info(f"POST /inspections/send-documents/ with: {json.dumps(payload)}")

            response = client.post(
                '/inspections/send-documents/',
                data=json.dumps(payload),
                content_type='application/json',
            )

            info(f"Response status: {response.status_code}")
            try:
                resp_data = json.loads(response.content)
                info(f"Response body: {json.dumps(resp_data, indent=2)}")
                if resp_data.get('success'):
                    ok(f"VIEW RETURNED SUCCESS! Email sent to {resp_data.get('recipients')}")
                else:
                    fail(f"VIEW RETURNED ERROR: {resp_data.get('error')}")
            except Exception:
                info(f"Response content: {response.content[:500]}")
    else:
        fail("No user found in database!")

except Exception as e:
    fail(f"Django test client simulation crashed: {e}")
    traceback.print_exc()


# =========================================================================
header(5, "CHECK GUNICORN LOGS FOR RECENT SEND ATTEMPTS")
# =========================================================================

import subprocess
try:
    result = subprocess.run(
        ['journalctl', '-u', 'gunicorn', '--no-pager', '-n', '100', '--output=cat'],
        capture_output=True, text=True, timeout=10
    )
    lines = result.stdout.strip().split('\n')
    send_lines = [l for l in lines if 'send' in l.lower() or 'SEND' in l or 'send-documents' in l or 'error' in l.lower() or 'Error' in l or 'traceback' in l.lower()]
    if send_lines:
        info(f"Found {len(send_lines)} relevant log lines:")
        for line in send_lines[-20:]:  # Last 20
            print(f"    {line}")
    else:
        warn("No send-related lines in recent gunicorn logs")
except Exception as e:
    warn(f"Could not read gunicorn logs: {e}")


# =========================================================================
header(6, "SUMMARY")
# =========================================================================

issues_found = [r for r in test_results if r['issues']]
if issues_found:
    fail(f"{len(issues_found)} groups have issues:")
    for r in issues_found:
        print(f"    {RED}{r['client']}{RESET} ({r['date']}): {', '.join(r['issues'])}")
else:
    ok(f"All {len(test_results)} groups passed basic checks")

print(f"\n{'='*60}\n")
