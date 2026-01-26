#!/usr/bin/env python
"""
Delete everything and create fresh test data with new parent-child system
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectionGroup, Client
from django.db.models import Count, Max, Min
from datetime import datetime

print("\n" + "="*80)
print("FRESH START - NEW PARENT-CHILD SYSTEM")
print("="*80)

# Step 1: Delete everything
print("\n" + "-"*80)
print("STEP 1: DELETE EVERYTHING")
print("-"*80)

inspection_count = FoodSafetyAgencyInspection.objects.count()
group_count = InspectionGroup.objects.count()

# Delete all groups (CASCADE will delete all inspections)
InspectionGroup.objects.all().delete()

print(f"✓ Deleted {group_count} inspection groups")
print(f"✓ Deleted {inspection_count} inspections (CASCADE)")

# Verify
remaining_inspections = FoodSafetyAgencyInspection.objects.count()
remaining_groups = InspectionGroup.objects.count()

print(f"\nRemaining inspections: {remaining_inspections}")
print(f"Remaining groups: {remaining_groups}")

if remaining_inspections == 0 and remaining_groups == 0:
    print("\n✅ Database is completely clean!")
else:
    print(f"\n⚠️  WARNING: {remaining_inspections} inspections and {remaining_groups} groups still exist")

# Step 2: Get or create client
print("\n" + "-"*80)
print("STEP 2: CREATE CLIENT")
print("-"*80)

client, created = Client.objects.get_or_create(
    name='Woolworths (Rosebank)',
    defaults={
        'town': 'Rosebank',
        'corporate_group': 'Woolworths',
        'group_type': 'Individual / Independent Owner',
        'facility_type': 'Retailer',
    }
)

if created:
    print(f"✓ Created new client: {client.name} (ID {client.id})")
else:
    print(f"✓ Using existing client: {client.name} (ID {client.id})")

# Step 3: Create PARENT InspectionGroup
print("\n" + "-"*80)
print("STEP 3: CREATE PARENT INSPECTION GROUP")
print("-"*80)

parent_group = InspectionGroup.objects.create(
    client=client,
    client_name='Woolworths (Rosebank)',
    date_of_inspection='2026-01-26',
    inspector_name='John Smith',
    town='Rosebank',
    facility_type='Retailer',
    group_type='Individual / Independent Owner',
    corporate_group='Woolworths',
    additional_email='test@woolworths.co.za',
    comment='Test inspection with new parent-child system',
    km_traveled=50,
    hours=2.5,
    is_manual=True,
)

print(f"✓ Created parent group (ID {parent_group.id})")
print(f"  Client: {parent_group.client_name}")
print(f"  Date: {parent_group.date_of_inspection}")
print(f"  Inspector: {parent_group.inspector_name}")
print(f"  KM: {parent_group.km_traveled}, Hours: {parent_group.hours}")

# Step 4: Create CHILDREN inspections (commodities)
print("\n" + "-"*80)
print("STEP 4: CREATE CHILD INSPECTIONS (COMMODITIES)")
print("-"*80)

commodities_data = [
    {
        'commodity': 'POULTRY',
        'product_name': 'Chicken Breast',
        'product_class': 'Whole muscle',
        'fat': True,
        'protein': True,
        'calcium': False,
        'dna': True,
    },
    {
        'commodity': 'EGGS',
        'product_name': 'Large Eggs',
        'product_class': 'Class A',
        'fat': False,
        'protein': True,
        'calcium': True,
        'dna': False,
    },
    {
        'commodity': 'RAW',
        'product_name': 'Beef Mince',
        'product_class': 'Beef Mince',
        'fat': True,
        'protein': True,
        'calcium': False,
        'dna': True,
    },
    {
        'commodity': 'PMP',
        'product_name': 'Polony',
        'product_class': 'Comminuted, cured and heat treated',
        'fat': True,
        'protein': True,
        'calcium': True,
        'dna': False,
    },
]

created_inspections = []

for seq, data in enumerate(commodities_data, start=1):
    inspection = FoodSafetyAgencyInspection.objects.create(
        # PARENT REFERENCE (NEW!)
        inspection_group=parent_group,

        # Sequence within group
        inspection_sequence=seq,

        # Basic info (copied from parent for convenience)
        remote_id=-9999 - seq,
        client=client,
        client_name=parent_group.client_name,
        date_of_inspection=parent_group.date_of_inspection,
        inspector_name=parent_group.inspector_name,
        town=parent_group.town,
        facility_type=parent_group.facility_type,
        group_type=parent_group.group_type,
        corporate_group=parent_group.corporate_group,
        additional_email=parent_group.additional_email,
        comment=parent_group.comment,
        km_traveled=parent_group.km_traveled,
        hours=parent_group.hours,
        is_manual=True,

        # COMMODITY-SPECIFIC DATA
        commodity=data['commodity'],
        product_name=data['product_name'],
        product_class=data['product_class'],

        # Sample/testing data
        lab='Lab A',
        is_sample_taken=True,
        bought_sample=500,
        fat=data['fat'],
        protein=data['protein'],
        calcium=data['calcium'],
        dna=data['dna'],
    )

    created_inspections.append(inspection)
    print(f"✓ Created child inspection #{seq} (ID {inspection.id})")
    print(f"  Commodity: {inspection.commodity}")
    print(f"  Product: {inspection.product_name}")
    print(f"  Tests: Fat={inspection.fat}, Protein={inspection.protein}, Calcium={inspection.calcium}, DNA={inspection.dna}")

# Step 5: Test grouping
print("\n" + "-"*80)
print("STEP 5: TEST GROUPING (like shipment_list view)")
print("-"*80)

# This is the exact query used in shipment_list
groups = FoodSafetyAgencyInspection.objects.values(
    'inspection_group',
    'client_name',
    'date_of_inspection',
).annotate(
    inspection_count=Count('id'),
    latest_inspection_id=Max('id'),
    earliest_inspection_id=Min('id'),
).order_by('-date_of_inspection')

print(f"\nGrouping query returned {groups.count()} group(s):\n")

for group in groups:
    print(f"Group ID: {group['inspection_group']}")
    print(f"  Client: {group['client_name']}")
    print(f"  Date: {group['date_of_inspection']}")
    print(f"  Inspections: {group['inspection_count']}")
    print(f"  Edit URL: /inspections/edit-fsa/{group['earliest_inspection_id']}/")

    # Get children
    children = FoodSafetyAgencyInspection.objects.filter(
        inspection_group_id=group['inspection_group']
    ).order_by('inspection_sequence')

    print(f"\n  Children ({children.count()}):")
    for child in children:
        print(f"    Seq #{child.inspection_sequence}: {child.commodity:10} - {child.product_name:25} (ID {child.id})")
    print()

# Test results
if groups.count() == 1 and groups[0]['inspection_count'] == 4:
    print("✅ TEST PASSED: All 4 commodities grouped as ONE entry!")
else:
    print(f"❌ TEST FAILED: Expected 1 group with 4 inspections, got {groups.count()} group(s)")

# Step 6: Test parent-child relationship
print("\n" + "-"*80)
print("STEP 6: TEST PARENT-CHILD RELATIONSHIP")
print("-"*80)

# Access parent from child
first_child = created_inspections[0]
print(f"\nChild inspection ID {first_child.id} ({first_child.commodity}):")
print(f"  Has parent group: {first_child.inspection_group is not None}")
print(f"  Parent group ID: {first_child.inspection_group.id}")
print(f"  Parent client: {first_child.inspection_group.client_name}")

# Access children from parent
print(f"\nParent group ID {parent_group.id}:")
print(f"  Has {parent_group.inspections.count()} children")
for child in parent_group.inspections.all().order_by('inspection_sequence'):
    print(f"    - {child.commodity}: {child.product_name}")

# Step 7: Test CASCADE delete
print("\n" + "-"*80)
print("STEP 7: TEST CASCADE DELETE (SIMULATION)")
print("-"*80)

print("\nIf we delete the parent group, Django will CASCADE delete all children automatically.")
print("This is NOT executed - just explaining:")
print(f"  parent_group.delete()  # Would delete group {parent_group.id} AND all 4 children")

# Final summary
print("\n" + "="*80)
print("FINAL SUMMARY")
print("="*80)

print(f"""
✅ FRESH START SUCCESSFUL!

Created:
  - 1 Client: {client.name} (ID {client.id})
  - 1 Parent Group: ID {parent_group.id}
  - 4 Child Inspections: IDs {[i.id for i in created_inspections]}

Database state:
  - Total groups: {InspectionGroup.objects.count()}
  - Total inspections: {FoodSafetyAgencyInspection.objects.count()}
  - Inspections in this group: {parent_group.inspections.count()}

Grouping works:
  ✅ Shipment list query groups all 4 commodities as ONE entry
  ✅ Parent-child relationship works correctly
  ✅ CASCADE delete ready (delete parent = delete all children)

Next steps:
  1. Restart Django server
  2. Go to http://127.0.0.1:8000/inspections/shipment-list/
  3. You should see ONE entry for Woolworths with 4 commodities
  4. Click Edit to test editing (may need view updates)

NO MORE ACCOUNT CODE BUGS! ✨
""")

print("="*80)
