#!/usr/bin/env python
"""
Check what happens when you create two identical inspections
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, Client

def check_duplicate_inspection_issue():
    print("\n" + "="*80)
    print("DUPLICATE INSPECTION GROUPING TEST")
    print("="*80)

    # Check Checker Menly client
    client = Client.objects.filter(name='Checker Menly').first()

    print("\n" + "-"*80)
    print("STEP 1: Check Client's internal_account_code")
    print("-"*80)

    if client:
        print(f"\nChecker Menly client found:")
        print(f"  ID: {client.id}")
        print(f"  Name: {client.name}")
        print(f"  Internal Account Code: {client.internal_account_code}")
    else:
        print("\n⚠ No Checker Menly client found in Client table")
        print("  This means inspections don't have a client record to reference")

    print("\n" + "-"*80)
    print("STEP 2: Check existing Checker Menly inspections")
    print("-"*80)

    inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checker Menly',
        date_of_inspection='2026-01-25'
    ).exclude(is_occurrence_report=True).order_by('id')

    print(f"\nChecker Menly inspections on 2026-01-25:")
    for insp in inspections:
        print(f"  ID {insp.id}: {insp.commodity:8} - internal_account_code: '{insp.internal_account_code}'")

    print("\n" + "-"*80)
    print("STEP 3: Simulate creating two identical inspections")
    print("-"*80)

    print("\nScenario: Inspector adds two POULTRY inspections for same client on same day")
    print("  Client: Shoprite")
    print("  Date: 2026-01-25")
    print("  Commodity: POULTRY")
    print("  Both inspections are separate visits with different products")

    # Check Shoprite client
    shoprite_client = Client.objects.filter(name__icontains='Shoprite').first()

    if shoprite_client:
        print(f"\nShoprite client internal_account_code: '{shoprite_client.internal_account_code}'")

        print("\nWhen creating inspection #1:")
        print(f"  1. Select client: Shoprite")
        print(f"  2. System auto-fills internal_account_code = '{shoprite_client.internal_account_code}'")
        print(f"  3. Select commodity: POULTRY")
        print(f"  4. Save inspection → internal_account_code = '{shoprite_client.internal_account_code}'")

        print("\nWhen creating inspection #2:")
        print(f"  1. Select client: Shoprite")
        print(f"  2. System auto-fills internal_account_code = '{shoprite_client.internal_account_code}'")
        print(f"  3. Select commodity: POULTRY")
        print(f"  4. Save inspection → internal_account_code = '{shoprite_client.internal_account_code}'")

        print("\n" + "-"*80)
        print("RESULT OF GROUPING")
        print("-"*80)

        print(f"\nGrouping key: (client_name, date, internal_account_code)")
        print(f"  Inspection #1: ('Shoprite', 2026-01-25, '{shoprite_client.internal_account_code}')")
        print(f"  Inspection #2: ('Shoprite', 2026-01-25, '{shoprite_client.internal_account_code}')")
        print(f"\n❌ PROBLEM: Both inspections have the SAME grouping key!")
        print(f"   They will be GROUPED TOGETHER and show as ONE entry")
        print(f"   Expected: 2 separate entries")
        print(f"   Actual: 1 combined entry")

    print("\n" + "="*80)
    print("ANALYSIS")
    print("="*80)

    print("\nCurrent behavior:")
    print("  • internal_account_code comes from the Client record")
    print("  • All inspections for same client get the SAME code")
    print("  • Grouping by (client, date, code) merges them into one")

    print("\nThis is why Checker Menly had None:")
    print("  • Checker Menly client doesn't exist in Client table")
    print("  • So all inspections got internal_account_code = None")
    print("  • All grouped together as one entry")

    print("\nSolutions:")
    print("  1. Generate UNIQUE internal_account_code per inspection (not from client)")
    print("  2. Add inspection sequence number to the code")
    print("  3. Add commodity to the grouping key")
    print("  4. Use inspection ID in the grouping")

    print("\n" + "="*80)
    print("RECOMMENDED FIX")
    print("="*80)

    print("\nGenerate unique code per inspection:")
    print("  Format: {CLIENT_CODE}-{DATE}-{COMMODITY}-{SEQUENCE}")
    print("  Example:")
    print("    Inspection #1: SHOPRITE-001-2026-01-25-POULTRY-1")
    print("    Inspection #2: SHOPRITE-001-2026-01-25-POULTRY-2")
    print("  Result: Two different codes = Two separate entries ✓")

    print("="*80)

    return True

if __name__ == '__main__':
    try:
        success = check_duplicate_inspection_issue()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
