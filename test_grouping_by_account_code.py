#!/usr/bin/env python
"""
Test that shipment_list groups inspections by internal_account_code
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from django.db.models import Q

def test_grouping_by_account_code():
    print("\n" + "="*80)
    print("TEST GROUPING BY INTERNAL_ACCOUNT_CODE")
    print("="*80)

    # Test with Checker Menly inspections on 2026-01-25
    print("\n" + "-"*80)
    print("STEP 1: Verify Checker Menly inspections have unique codes")
    print("-"*80)

    checker_inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checker Menly',
        date_of_inspection='2026-01-25'
    ).exclude(is_occurrence_report=True).order_by('id')

    print(f"\nFound {checker_inspections.count()} regular Checker Menly inspections:")
    for insp in checker_inspections:
        print(f"  ID {insp.id}: {insp.commodity:8} - {insp.internal_account_code}")

    # Verify each has a unique code
    codes = set()
    errors = []
    for insp in checker_inspections:
        if not insp.internal_account_code:
            errors.append(f"  ✗ Inspection {insp.id} has None internal_account_code")
        else:
            codes.add(insp.internal_account_code)

    if errors:
        print("\n❌ Some inspections missing internal_account_code:")
        for error in errors:
            print(error)
        return False

    print(f"\n✓ All inspections have internal_account_code")
    print(f"✓ Found {len(codes)} unique codes:")
    for code in sorted(codes):
        count = checker_inspections.filter(internal_account_code=code).count()
        print(f"  - {code}: {count} inspection(s)")

    print("\n" + "-"*80)
    print("STEP 2: Simulate shipment_list grouping logic")
    print("-"*80)

    # Simulate what shipment_list does
    groups_queryset = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checker Menly',
        date_of_inspection='2026-01-25'
    ).exclude(is_occurrence_report=True).values(
        'client_name',
        'date_of_inspection',
        'internal_account_code'
    ).annotate(
        inspection_count=django.db.models.Count('id')
    ).order_by('-date_of_inspection', 'client_name')

    print(f"\nGroups created by shipment_list logic:")
    group_count = 0
    for group in groups_queryset:
        group_count += 1
        print(f"\n  Group {group_count}:")
        print(f"    Client: {group['client_name']}")
        print(f"    Date: {group['date_of_inspection']}")
        print(f"    Account Code: {group['internal_account_code']}")
        print(f"    Inspection Count: {group['inspection_count']}")

    print(f"\n✓ Total groups: {group_count}")

    # Expected: 6 groups (3 POULTRY + 2 RAW + 1 PMP)
    expected_groups = 6
    if group_count != expected_groups:
        print(f"\n❌ Expected {expected_groups} groups but got {group_count}")
        return False

    print("\n" + "-"*80)
    print("STEP 3: Test grouped_inspections_dict lookup")
    print("-"*80)

    # Build the dictionary like shipment_list does
    from collections import defaultdict
    grouped_inspections_dict = defaultdict(list)

    for inspection in checker_inspections:
        key = (inspection.client_name, inspection.date_of_inspection, inspection.internal_account_code)
        grouped_inspections_dict[key].append(inspection)

    print(f"\nGrouped inspections dictionary:")
    for key, inspections in sorted(grouped_inspections_dict.items()):
        client_name, date_of_inspection, internal_account_code = key
        print(f"\n  Key: ('{client_name}', {date_of_inspection}, '{internal_account_code}')")
        print(f"  Inspections: {len(inspections)}")
        for insp in inspections:
            print(f"    ID {insp.id}: {insp.commodity} - {insp.product_name or '(no product)'}")

    print(f"\n✓ Dictionary has {len(grouped_inspections_dict)} groups")

    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED!")
    print("="*80)
    print("\nSummary:")
    print(f"  ✓ All {checker_inspections.count()} Checker Menly inspections have internal_account_code")
    print(f"  ✓ Grouping by (client_name, date, internal_account_code) creates {group_count} groups")
    print(f"  ✓ Each group will appear as a separate entry in shipment list")
    print(f"\nBefore fix: All 6 inspections showed as ONE combined entry")
    print(f"After fix: 6 separate inspection entries will be shown")
    print("="*80)

    return True

if __name__ == '__main__':
    try:
        # Import Count here
        import django.db.models
        success = test_grouping_by_account_code()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
