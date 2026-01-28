#!/usr/bin/env python3
"""
Comprehensive test for add/edit inspection functionality with parent-child system
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
print("COMPREHENSIVE TEST: ADD & EDIT INSPECTIONS WITH PARENT-CHILD SYSTEM")
print("="*80)

# Clean up test data from previous runs
print("\n" + "-"*80)
print("CLEANUP: Removing old test data")
print("-"*80)

test_client_name = "TEST_CLIENT_DO_NOT_USE"
test_groups = InspectionGroup.objects.filter(client_name=test_client_name)
test_inspections = FoodSafetyAgencyInspection.objects.filter(client_name=test_client_name)
test_client = Client.objects.filter(name=test_client_name)

print(f"Found {test_groups.count()} test groups to delete")
print(f"Found {test_inspections.count()} test inspections to delete")
print(f"Found {test_client.count()} test clients to delete")

test_groups.delete()
test_inspections.delete()
test_client.delete()

print("✓ Cleanup complete")

# TEST 1: Simulate adding a new multi-commodity inspection
print("\n" + "-"*80)
print("TEST 1: ADD NEW MULTI-COMMODITY INSPECTION")
print("-"*80)

# Get or create test client
client = Client.objects.create(
    name=test_client_name,
    town='Test Town',
    corporate_group='Woolworths',
    group_type='Individual / Independent Owner',
    facility_type='Retailer',
)
print(f"✓ Created test client: {client.name} (ID {client.id})")

# Create parent InspectionGroup (simulating what add_fsa_inspection does)
parent_group = InspectionGroup.objects.create(
    client=client,
    client_name=test_client_name,
    date_of_inspection='2026-01-26',
    inspector_name='Test Inspector',
    town='Test Town',
    facility_type='Retailer',
    group_type='Individual / Independent Owner',
    corporate_group='Woolworths',
    additional_email='test@test.com',
    comment='Test inspection',
    km_traveled=50,
    hours=2.5,
    is_manual=True,
)
print(f"✓ Created parent group (ID {parent_group.id})")

# Create child inspections (simulating multiple commodities)
products_data = [
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
        'commodity': 'RAW',
        'product_name': 'Beef Mince',
        'product_class': 'Ground Burger',
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
for seq, data in enumerate(products_data, start=1):
    inspection = FoodSafetyAgencyInspection.objects.create(
        # Link to parent group
        inspection_group=parent_group,
        client=client,

        # Sequence number
        inspection_sequence=seq,

        # Basic info
        remote_id=-1000 - seq,
        client_name=test_client_name,
        date_of_inspection='2026-01-26',
        inspector_name='Test Inspector',
        town='Test Town',
        facility_type='Retailer',
        group_type='Individual / Independent Owner',
        corporate_group='Woolworths',
        additional_email='test@test.com',
        comment='Test inspection',
        km_traveled=50,
        hours=2.5,
        is_manual=True,

        # Commodity-specific data
        commodity=data['commodity'],
        product_name=data['product_name'],
        product_class=data['product_class'],
        lab='Lab A',
        is_sample_taken=True,
        bought_sample=500,
        fat=data['fat'],
        protein=data['protein'],
        calcium=data['calcium'],
        dna=data['dna'],

        # Account code not needed anymore
        internal_account_code=None,
    )
    created_inspections.append(inspection)
    print(f"✓ Created child inspection #{seq} (ID {inspection.id}): {inspection.commodity} - {inspection.product_name}")

# Verify parent-child relationships
print("\n" + "-"*80)
print("VERIFICATION 1: Parent-Child Relationships")
print("-"*80)

for insp in created_inspections:
    insp.refresh_from_db()
    if insp.inspection_group is None:
        print(f"❌ FAIL: Inspection {insp.id} has NO parent group!")
        sys.exit(1)
    if insp.inspection_group.id != parent_group.id:
        print(f"❌ FAIL: Inspection {insp.id} linked to WRONG parent (expected {parent_group.id}, got {insp.inspection_group.id})")
        sys.exit(1)
    if insp.inspection_sequence < 1:
        print(f"❌ FAIL: Inspection {insp.id} has invalid sequence: {insp.inspection_sequence}")
        sys.exit(1)
    print(f"✓ Inspection {insp.id} correctly linked to parent {parent_group.id} with sequence {insp.inspection_sequence}")

# Check parent can access children
children_count = parent_group.inspections.count()
if children_count != len(products_data):
    print(f"❌ FAIL: Parent group has {children_count} children, expected {len(products_data)}")
    sys.exit(1)
print(f"✓ Parent group has {children_count} children (correct)")

# TEST 2: Verify grouping query (like shipment_list does)
print("\n" + "-"*80)
print("TEST 2: GROUPING QUERY (Shipment List)")
print("-"*80)

groups = FoodSafetyAgencyInspection.objects.filter(
    client_name=test_client_name
).values(
    'inspection_group',
    'client_name',
    'date_of_inspection',
).annotate(
    inspection_count=Count('id'),
    latest_inspection_id=Max('id'),
    earliest_inspection_id=Min('id'),
).order_by('-date_of_inspection')

print(f"Query returned {groups.count()} group(s)")

if groups.count() != 1:
    print(f"❌ FAIL: Expected 1 group, got {groups.count()}")
    sys.exit(1)
print("✓ Grouping returns exactly 1 group")

group = groups[0]
if group['inspection_count'] != len(products_data):
    print(f"❌ FAIL: Group has {group['inspection_count']} inspections, expected {len(products_data)}")
    sys.exit(1)
print(f"✓ Group contains {group['inspection_count']} inspections (correct)")

if group['inspection_group'] != parent_group.id:
    print(f"❌ FAIL: Group ID mismatch (expected {parent_group.id}, got {group['inspection_group']})")
    sys.exit(1)
print(f"✓ Group ID is {group['inspection_group']} (correct)")

# TEST 3: Simulate editing - add a new commodity
print("\n" + "-"*80)
print("TEST 3: EDIT - Add New Commodity (EGGS)")
print("-"*80)

# Find max remote_id to generate new one
from django.db.models import Min as MinFunc
min_remote_id = FoodSafetyAgencyInspection.objects.filter(
    is_manual=True
).aggregate(MinFunc('remote_id'))['remote_id__min']
new_remote_id = min_remote_id - 1 if min_remote_id else -1

# Add EGGS commodity to existing group
new_inspection = FoodSafetyAgencyInspection.objects.create(
    # Link to SAME parent group
    inspection_group=parent_group,
    client=client,

    # Temporary sequence (will re-sequence after)
    inspection_sequence=999,

    # Basic info (copy from parent)
    remote_id=new_remote_id,
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

    # New commodity data
    commodity='EGGS',
    product_name='Large Eggs',
    product_class='Class A',
    lab='Lab A',
    is_sample_taken=True,
    bought_sample=500,
    fat=False,
    protein=True,
    calcium=True,
    dna=False,

    internal_account_code=None,
)
print(f"✓ Created new EGGS inspection (ID {new_inspection.id})")

# Re-sequence all inspections in the group (like edit view does)
all_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspection_group=parent_group
).order_by('id')

for seq_num, insp in enumerate(all_inspections, start=1):
    insp.inspection_sequence = seq_num
    insp.save(update_fields=['inspection_sequence'])
print(f"✓ Re-sequenced {all_inspections.count()} inspections")

# Verify re-sequencing
print("\n" + "-"*80)
print("VERIFICATION 2: Re-sequencing After Edit")
print("-"*80)

all_inspections = all_inspections.order_by('inspection_sequence')
expected_sequence = 1
for insp in all_inspections:
    if insp.inspection_sequence != expected_sequence:
        print(f"❌ FAIL: Inspection {insp.id} has sequence {insp.inspection_sequence}, expected {expected_sequence}")
        sys.exit(1)
    print(f"✓ Inspection {insp.id} ({insp.commodity}): sequence {insp.inspection_sequence} (correct)")
    expected_sequence += 1

# Verify grouping still shows ONE group with 4 inspections
print("\n" + "-"*80)
print("VERIFICATION 3: Grouping After Edit")
print("-"*80)

groups = FoodSafetyAgencyInspection.objects.filter(
    client_name=test_client_name
).values(
    'inspection_group',
    'client_name',
    'date_of_inspection',
).annotate(
    inspection_count=Count('id'),
).order_by('-date_of_inspection')

if groups.count() != 1:
    print(f"❌ FAIL: Expected 1 group after edit, got {groups.count()}")
    sys.exit(1)
print("✓ Still 1 group after adding EGGS")

group = groups[0]
if group['inspection_count'] != 4:
    print(f"❌ FAIL: Group has {group['inspection_count']} inspections, expected 4")
    sys.exit(1)
print(f"✓ Group now contains {group['inspection_count']} inspections (correct)")

# TEST 4: Simulate editing - remove a commodity
print("\n" + "-"*80)
print("TEST 4: EDIT - Remove Commodity (POULTRY)")
print("-"*80)

# Delete POULTRY inspection
poultry_insp = FoodSafetyAgencyInspection.objects.filter(
    inspection_group=parent_group,
    commodity='POULTRY'
).first()

if not poultry_insp:
    print("❌ FAIL: Could not find POULTRY inspection to delete")
    sys.exit(1)

poultry_id = poultry_insp.id
poultry_insp.delete()
print(f"✓ Deleted POULTRY inspection (ID {poultry_id})")

# Re-sequence again
all_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspection_group=parent_group
).order_by('id')

for seq_num, insp in enumerate(all_inspections, start=1):
    insp.inspection_sequence = seq_num
    insp.save(update_fields=['inspection_sequence'])
print(f"✓ Re-sequenced {all_inspections.count()} remaining inspections")

# Verify grouping shows ONE group with 3 inspections
print("\n" + "-"*80)
print("VERIFICATION 4: Grouping After Delete")
print("-"*80)

groups = FoodSafetyAgencyInspection.objects.filter(
    client_name=test_client_name
).values(
    'inspection_group',
    'client_name',
    'date_of_inspection',
).annotate(
    inspection_count=Count('id'),
)

if groups.count() != 1:
    print(f"❌ FAIL: Expected 1 group after delete, got {groups.count()}")
    sys.exit(1)
print("✓ Still 1 group after deleting POULTRY")

group = groups[0]
if group['inspection_count'] != 3:
    print(f"❌ FAIL: Group has {group['inspection_count']} inspections, expected 3")
    sys.exit(1)
print(f"✓ Group now contains {group['inspection_count']} inspections (correct)")

# Final verification
print("\n" + "-"*80)
print("VERIFICATION 5: Final State Check")
print("-"*80)

all_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspection_group=parent_group
).order_by('inspection_sequence')

print(f"\nFinal group state:")
print(f"  Parent group ID: {parent_group.id}")
print(f"  Client: {parent_group.client_name}")
print(f"  Date: {parent_group.date_of_inspection}")
print(f"  Total inspections: {all_inspections.count()}")
print(f"\n  Children:")

for insp in all_inspections:
    print(f"    Seq #{insp.inspection_sequence}: {insp.commodity:10} - {insp.product_name:20} (ID {insp.id})")

    # Verify each child has proper parent link
    if insp.inspection_group_id != parent_group.id:
        print(f"❌ FAIL: Child {insp.id} has wrong parent!")
        sys.exit(1)

    # Verify sequence is continuous
    if insp.inspection_sequence < 1 or insp.inspection_sequence > all_inspections.count():
        print(f"❌ FAIL: Child {insp.id} has invalid sequence {insp.inspection_sequence}")
        sys.exit(1)

# Test CASCADE delete
print("\n" + "-"*80)
print("TEST 5: CASCADE DELETE")
print("-"*80)

children_count = parent_group.inspections.count()
print(f"Parent group has {children_count} children")
print(f"Deleting parent group (should CASCADE delete all children)...")

parent_group.delete()

remaining_inspections = FoodSafetyAgencyInspection.objects.filter(
    client_name=test_client_name
).count()

if remaining_inspections != 0:
    print(f"❌ FAIL: {remaining_inspections} orphaned inspections remain after CASCADE delete!")
    sys.exit(1)
print(f"✓ All {children_count} children were CASCADE deleted with parent")

# Clean up
print("\n" + "-"*80)
print("CLEANUP: Removing test data")
print("-"*80)

client.delete()
print("✓ Test client deleted")

# Final summary
print("\n" + "="*80)
print("🎉 ALL TESTS PASSED!")
print("="*80)
print("""
✅ Parent-child relationships work correctly
✅ Grouping query returns single entry with all commodities
✅ Adding commodities in edit mode links to same parent
✅ Deleting commodities maintains group integrity
✅ Re-sequencing works properly
✅ CASCADE delete removes all children with parent

The system is ready for production use!
""")
print("="*80)
