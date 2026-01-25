#!/usr/bin/env python
"""
Fix Checker Menly inspections that have None internal_account_code
Generate unique codes for each separate inspection group
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection

def fix_checker_menly_codes():
    print("\n" + "="*80)
    print("FIX CHECKER MENLY INTERNAL_ACCOUNT_CODE")
    print("="*80)

    # Get all Checker Menly inspections on 2026-01-25 with None internal_account_code
    checker_inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checker Menly',
        date_of_inspection='2026-01-25',
        internal_account_code__isnull=True
    ).order_by('id')

    print(f"\nFound {checker_inspections.count()} inspections with None internal_account_code:")
    for insp in checker_inspections:
        print(f"  ID {insp.id}: {insp.commodity} - {insp.product_name or '(no product)'}")

    print("\n" + "-"*80)
    print("GENERATING UNIQUE CODES")
    print("-"*80)

    # Group inspections by commodity to create separate inspection visits
    # Each commodity type represents a different inspection visit on the same day
    commodity_groups = {}
    for insp in checker_inspections:
        # Skip occurrence reports - they shouldn't have internal_account_code set
        if getattr(insp, 'is_occurrence_report', False):
            continue

        commodity = insp.commodity
        if commodity not in commodity_groups:
            commodity_groups[commodity] = []
        commodity_groups[commodity].append(insp)

    print(f"\nGrouped into {len(commodity_groups)} separate inspection visits:")
    for commodity, inspections in commodity_groups.items():
        print(f"  {commodity}: {len(inspections)} inspection(s)")

    # Generate unique codes for each group
    # Format: CHECKER-MENLY-2026-01-25-{COMMODITY}-{INDEX}
    updated_count = 0

    for commodity, inspections in commodity_groups.items():
        # For each commodity, assign the same code to all inspections
        # This keeps them grouped as ONE inspection visit per commodity
        base_code = f"CHECKER-MENLY-2026-01-25-{commodity}"

        # If there are multiple inspections of same commodity, number them
        if len(inspections) == 1:
            code = base_code
        else:
            # Multiple inspections of same commodity on same day
            # Give each one a unique code
            for idx, insp in enumerate(inspections, 1):
                code = f"{base_code}-{idx}"
                old_code = insp.internal_account_code
                insp.internal_account_code = code
                insp.save()
                updated_count += 1
                print(f"  ✓ Updated ID {insp.id}: {old_code} → {code}")
            continue

        # Single inspection of this commodity
        for insp in inspections:
            old_code = insp.internal_account_code
            insp.internal_account_code = code
            insp.save()
            updated_count += 1
            print(f"  ✓ Updated ID {insp.id}: {old_code} → {code}")

    print("\n" + "-"*80)
    print("VERIFICATION")
    print("-"*80)

    # Verify the changes
    checker_inspections_after = FoodSafetyAgencyInspection.objects.filter(
        client_name='Checker Menly',
        date_of_inspection='2026-01-25',
        internal_account_code__isnull=False
    ).exclude(is_occurrence_report=True).order_by('internal_account_code', 'id')

    print(f"\nInspections after fix:")
    current_code = None
    for insp in checker_inspections_after:
        if insp.internal_account_code != current_code:
            current_code = insp.internal_account_code
            print(f"\n  Group: {current_code}")
        print(f"    ID {insp.id}: {insp.commodity} - {insp.product_name or '(no product)'}")

    # Count unique codes
    unique_codes = set()
    for insp in checker_inspections_after:
        if insp.internal_account_code:
            unique_codes.add(insp.internal_account_code)

    print("\n" + "="*80)
    print("✅ FIX COMPLETE")
    print("="*80)
    print(f"\nSummary:")
    print(f"  ✓ Updated {updated_count} inspections")
    print(f"  ✓ Created {len(unique_codes)} unique inspection groups:")
    for code in sorted(unique_codes):
        count = checker_inspections_after.filter(internal_account_code=code).count()
        print(f"    - {code}: {count} inspection(s)")
    print(f"\nThese groups will now appear as separate entries in shipment list")
    print("="*80)

    return True

if __name__ == '__main__':
    try:
        success = fix_checker_menly_codes()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
