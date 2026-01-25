#!/usr/bin/env python
"""
Test that duplicate inspections (same client, same date, same commodity) get unique codes
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client, FoodSafetyAgencyInspection
from main.views.core_views import generate_unique_internal_account_code
from datetime import datetime

def test_duplicate_inspections():
    print("\n" + "="*80)
    print("DUPLICATE INSPECTION TEST")
    print("="*80)
    print("\nScenario: Two identical POULTRY inspections for Checkers on May 10, 2026")
    print("Expected: Each gets a unique code with different sequence number")

    # Get or create Checkers client
    checkers = Client.objects.filter(name__icontains='Checker').first()
    if not checkers:
        print("\nCreating Checkers client...")
        checkers = Client.objects.create(
            name='Checkers Menly',
            facility_type='Retailer',
            group_type='Corporate Store',
            corporate_group='Checkers'
        )

    print(f"\nCheckers client: ID {checkers.id}, Name: {checkers.name}")

    print("\n" + "-"*80)
    print("TEST 1: Generate code for 1st POULTRY inspection")
    print("-"*80)

    code1 = generate_unique_internal_account_code(
        client_name='Checkers Menly',
        date_of_inspection='2026-05-10',
        facility_type='Retailer',
        group_type='Corporate Store',
        commodity='POULTRY',
        corporate_group='Checkers',
        client_id=checkers.id
    )

    print(f"\n1st inspection code: {code1}")
    print(f"Expected format:     RE-COR-PLT-CHE-{str(checkers.id).zfill(4)}-001")

    # Verify format
    parts = code1.split('-')
    assert len(parts) == 6, f"❌ Code should have 6 parts, got {len(parts)}"
    assert parts[0] == 'RE', f"❌ Facility should be RE, got {parts[0]}"
    assert parts[1] == 'COR', f"❌ Group should be COR, got {parts[1]}"
    assert parts[2] == 'PLT', f"❌ Commodity should be PLT, got {parts[2]}"
    assert parts[3] == 'CHE', f"❌ Corp should be CHE, got {parts[3]}"
    assert parts[4] == str(checkers.id).zfill(4), f"❌ Client ID mismatch"
    assert parts[5] == '001', f"❌ Sequence should be 001, got {parts[5]}"

    print("✓ Code format correct")

    print("\n" + "-"*80)
    print("TEST 2: Create actual inspection in database")
    print("-"*80)

    # Create the first inspection in database
    from django.db.models import Min
    min_remote_id = FoodSafetyAgencyInspection.objects.filter(
        is_manual=True
    ).aggregate(Min('remote_id'))['remote_id__min']
    if min_remote_id is None or min_remote_id >= 0:
        remote_id = -1
    else:
        remote_id = min_remote_id - 1

    inspection1 = FoodSafetyAgencyInspection.objects.create(
        remote_id=remote_id,
        client_name='Checkers Menly',
        date_of_inspection='2026-05-10',
        commodity='POULTRY',
        product_name='Chicken Breasts',
        facility_type='Retailer',
        group_type='Corporate Store',
        corporate_group='Checkers',
        internal_account_code=code1,
        is_manual=True,
        client=checkers
    )

    print(f"✓ Created inspection ID {inspection1.id} with code: {code1}")

    print("\n" + "-"*80)
    print("TEST 3: Generate code for 2nd identical POULTRY inspection")
    print("-"*80)

    code2 = generate_unique_internal_account_code(
        client_name='Checkers Menly',
        date_of_inspection='2026-05-10',
        facility_type='Retailer',
        group_type='Corporate Store',
        commodity='POULTRY',
        corporate_group='Checkers',
        client_id=checkers.id
    )

    print(f"\n2nd inspection code: {code2}")
    print(f"1st inspection code: {code1}")

    # Verify codes are different
    assert code1 != code2, f"❌ Codes should be different!"

    # Verify 2nd code has sequence 002
    parts2 = code2.split('-')
    assert parts2[5] == '002', f"❌ 2nd sequence should be 002, got {parts2[5]}"

    print("✓ Codes are different!")
    print(f"  Difference: ...{parts[5]} vs ...{parts2[5]}")

    print("\n" + "-"*80)
    print("TEST 4: Create 2nd inspection and verify grouping")
    print("-"*80)

    inspection2 = FoodSafetyAgencyInspection.objects.create(
        remote_id=remote_id - 1,
        client_name='Checkers Menly',
        date_of_inspection='2026-05-10',
        commodity='POULTRY',
        product_name='Chicken Thighs',
        facility_type='Retailer',
        group_type='Corporate Store',
        corporate_group='Checkers',
        internal_account_code=code2,
        is_manual=True,
        client=checkers
    )

    print(f"✓ Created inspection ID {inspection2.id} with code: {code2}")

    # Test grouping logic
    from django.db.models import Count
    groups = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checkers Menly',
        date_of_inspection='2026-05-10'
    ).values(
        'client_name',
        'date_of_inspection',
        'internal_account_code'
    ).annotate(
        count=Count('id')
    )

    print(f"\nGrouping results:")
    group_count = 0
    for group in groups:
        group_count += 1
        print(f"  Group {group_count}:")
        print(f"    Client: {group['client_name']}")
        print(f"    Date: {group['date_of_inspection']}")
        print(f"    Code: {group['internal_account_code']}")
        print(f"    Inspections: {group['count']}")

    assert group_count >= 2, f"❌ Should have at least 2 groups, got {group_count}"
    print(f"\n✓ Created {group_count} separate groups")

    print("\n" + "-"*80)
    print("TEST 5: Clean up test data")
    print("-"*80)

    inspection1.delete()
    inspection2.delete()
    print("✓ Deleted test inspections")

    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED!")
    print("="*80)
    print("\nResult:")
    print("  ✓ Two identical inspections get DIFFERENT codes")
    print("  ✓ Different codes = Different grouping keys")
    print("  ✓ Different grouping keys = SEPARATE entries in shipment list")
    print("\nExample:")
    print(f"  Checkers, May 10, POULTRY #1: {code1}")
    print(f"  Checkers, May 10, POULTRY #2: {code2}")
    print("  → Shows as 2 separate entries ✓")
    print("="*80)

    return True

if __name__ == '__main__':
    try:
        success = test_duplicate_inspections()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
