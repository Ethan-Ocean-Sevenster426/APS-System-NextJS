#!/usr/bin/env python
"""Find all invalid emails in the database and list the associated inspections."""
import os, sys, re, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client, ClientEmail, FoodSafetyAgencyInspection, InspectionGroup

VALID = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
CYAN = '\033[96m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'
WARN = '\u26a0\ufe0f'

print(f"\n{'='*80}")
print(f" INVALID EMAIL SCAN")
print(f"{'='*80}\n")

invalid_found = []

# 1. Check Client.email and Client.manual_email
print(f"{CYAN}── Checking Client records ──{RESET}")
for c in Client.objects.all():
    for field_name, value in [('email', c.email), ('manual_email', c.manual_email)]:
        if value and str(value).strip():
            for part in re.split(r'[,;]+', str(value)):
                e = part.strip()
                if e and not VALID.match(e):
                    print(f"  {RED}{WARN} Client '{c.name}' → {field_name}='{e}'{RESET}")
                    invalid_found.append(('Client', c.name, field_name, e))

# 2. Check ClientEmail records
print(f"\n{CYAN}── Checking ClientEmail records ──{RESET}")
for ce in ClientEmail.objects.select_related('client').all():
    if ce.email and str(ce.email).strip():
        for part in re.split(r'[,;]+', str(ce.email)):
            e = part.strip()
            if e and not VALID.match(e):
                client_name = ce.client.name if ce.client else 'Unknown'
                print(f"  {RED}{WARN} ClientEmail for '{client_name}' → '{e}'{RESET}")
                invalid_found.append(('ClientEmail', client_name, 'email', e))

# 3. Check FoodSafetyAgencyInspection.additional_email
print(f"\n{CYAN}── Checking Inspection additional_email fields ──{RESET}")
for insp in FoodSafetyAgencyInspection.objects.exclude(additional_email__isnull=True).exclude(additional_email=''):
    for part in re.split(r'[,;]+', str(insp.additional_email)):
        e = part.strip()
        if e and not VALID.match(e):
            print(f"  {RED}{WARN} Inspection '{insp.client_name}' (date={insp.date_of_inspection}, group={insp.inspection_group_id}) → additional_email='{e}'{RESET}")
            invalid_found.append(('Inspection', insp.client_name, f"date={insp.date_of_inspection} group={insp.inspection_group_id}", e))

# 4. Check InspectionGroup.additional_email
print(f"\n{CYAN}── Checking InspectionGroup additional_email fields ──{RESET}")
for grp in InspectionGroup.objects.exclude(additional_email__isnull=True).exclude(additional_email=''):
    for part in re.split(r'[,;]+', str(grp.additional_email)):
        e = part.strip()
        if e and not VALID.match(e):
            print(f"  {RED}{WARN} InspectionGroup id={grp.id}, client='{grp.client_name}' → additional_email='{e}'{RESET}")
            invalid_found.append(('InspectionGroup', grp.client_name, f"id={grp.id}", e))

# Summary
print(f"\n{'='*80}")
if invalid_found:
    print(f" {YELLOW}Found {len(invalid_found)} invalid email(s):{RESET}\n")
    for source, name, detail, email in invalid_found:
        print(f"  {WARN} [{source}] {name} ({detail}) → '{email}'")
else:
    print(f"  \u2705 No invalid emails found!")
print(f"\n{'='*80}")
