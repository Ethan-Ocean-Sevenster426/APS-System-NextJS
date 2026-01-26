#!/usr/bin/env python
"""
Migrate existing inspections to use the new parent-child InspectionGroup system
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectionGroup
from django.db.models import Count, Min

print("\n" + "="*80)
print("MIGRATE TO PARENT-CHILD INSPECTION GROUP SYSTEM")
print("="*80)

# Step 1: Find all existing inspection groups (by client + date + account code)
print("\n" + "-"*80)
print("STEP 1: FIND EXISTING INSPECTION GROUPS")
print("-"*80)

# Group existing inspections by client_name + date + internal_account_code
existing_groups = FoodSafetyAgencyInspection.objects.values(
    'client_name',
    'date_of_inspection',
    'internal_account_code'
).annotate(
    count=Count('id'),
    first_id=Min('id')
).order_by('client_name', 'date_of_inspection')

print(f"\nFound {existing_groups.count()} existing inspection groups")

# Step 2: Create parent InspectionGroup records
print("\n" + "-"*80)
print("STEP 2: CREATE PARENT INSPECTION GROUPS")
print("-"*80)

created_groups = 0
migrated_inspections = 0

for group_data in existing_groups:
    # Get first inspection to extract common fields
    first_inspection = FoodSafetyAgencyInspection.objects.filter(
        client_name=group_data['client_name'],
        date_of_inspection=group_data['date_of_inspection'],
        internal_account_code=group_data['internal_account_code']
    ).first()

    if not first_inspection:
        continue

    # Create parent InspectionGroup
    inspection_group = InspectionGroup.objects.create(
        client=first_inspection.client,
        client_name=first_inspection.client_name,
        date_of_inspection=first_inspection.date_of_inspection,
        inspector_name=first_inspection.inspector_name,
        town=first_inspection.town,
        facility_type=first_inspection.facility_type,
        group_type=first_inspection.group_type,
        corporate_group=first_inspection.corporate_group,
        additional_email=first_inspection.additional_email,
        comment=first_inspection.comment,
        km_traveled=first_inspection.km_traveled,
        hours=first_inspection.hours,
        is_manual=first_inspection.is_manual,
    )

    created_groups += 1

    # Link all inspections in this group to the parent
    inspections_in_group = FoodSafetyAgencyInspection.objects.filter(
        client_name=group_data['client_name'],
        date_of_inspection=group_data['date_of_inspection'],
        internal_account_code=group_data['internal_account_code']
    )

    for inspection in inspections_in_group:
        inspection.inspection_group = inspection_group
        inspection.save(update_fields=['inspection_group'])
        migrated_inspections += 1

    if created_groups % 10 == 0:
        print(f"  Created {created_groups} groups, migrated {migrated_inspections} inspections...")

print(f"\n✓ Created {created_groups} parent groups")
print(f"✓ Migrated {migrated_inspections} inspections to use parent-child relationships")

# Step 3: Verify migration
print("\n" + "-"*80)
print("STEP 3: VERIFY MIGRATION")
print("-"*80)

# Count inspections with and without groups
with_group = FoodSafetyAgencyInspection.objects.filter(inspection_group__isnull=False).count()
without_group = FoodSafetyAgencyInspection.objects.filter(inspection_group__isnull=True).count()

print(f"\nInspections with group: {with_group}")
print(f"Inspections without group: {without_group}")

if without_group == 0:
    print("\n✅ ALL inspections successfully migrated!")
else:
    print(f"\n⚠️  {without_group} inspections still need migration")

# Show sample groups
print("\n" + "-"*80)
print("SAMPLE GROUPS (NEW SYSTEM)")
print("-"*80)

sample_groups = InspectionGroup.objects.all()[:5]

for group in sample_groups:
    print(f"\nGroup #{group.id}: {group.client_name} - {group.date_of_inspection}")
    print(f"  Inspections ({group.inspections.count()}):")
    for insp in group.inspections.all().order_by('inspection_sequence'):
        print(f"    Seq #{insp.inspection_sequence}: {insp.commodity} - {insp.product_name}")

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("""
✅ The system now uses parent-child relationships:
   - InspectionGroup (parent) = one per client/date
   - FoodSafetyAgencyInspection (child) = one per commodity

✅ Benefits:
   - No more account code generation complexity
   - Add/delete commodities by simply adding/deleting children
   - Proper foreign key relationships
   - Much simpler grouping logic

⚠️  NEXT STEPS:
   1. Update create view to create InspectionGroup first
   2. Update edit view to query by inspection_group instead of account code
   3. Update shipment list to group by inspection_group
   4. Test in browser

The internal_account_code field is kept for backward compatibility but is
no longer used for grouping.
""")
print("="*80)
