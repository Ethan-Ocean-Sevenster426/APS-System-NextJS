#!/usr/bin/env python
"""
Populate inspection 390 with complete data for all 4 commodities
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection

print("\n" + "="*80)
print("POPULATE INSPECTION 390 - ALL COMMODITIES")
print("="*80)

# Get inspection 390 (POULTRY)
try:
    poultry_insp = FoodSafetyAgencyInspection.objects.get(id=390)
except FoodSafetyAgencyInspection.DoesNotExist:
    print("❌ Inspection 390 not found!")
    sys.exit(1)

# Update POULTRY inspection with complete data
print("\n1. Updating POULTRY inspection (ID 390)...")
poultry_insp.product_name = 'Chicken Sosaties'
poultry_insp.product_class = 'Whole muscle, marinated'
poultry_insp.lab = 'Lab C'
poultry_insp.is_sample_taken = True
poultry_insp.fat = True
poultry_insp.protein = True
poultry_insp.calcium = False
poultry_insp.dna = True
poultry_insp.bought_sample = 500
poultry_insp.km_traveled = 45
poultry_insp.hours = 2
poultry_insp.save()
print(f"   ✓ Updated POULTRY: {poultry_insp.product_name}")

# Update RAW inspection if it exists
try:
    raw_insp = FoodSafetyAgencyInspection.objects.get(id=391)
    print("\n2. Updating RAW inspection (ID 391)...")
    raw_insp.lab = 'Lab A'
    raw_insp.is_sample_taken = True
    raw_insp.fat = True
    raw_insp.protein = True
    raw_insp.calcium = False
    raw_insp.dna = False
    raw_insp.bought_sample = 500
    raw_insp.km_traveled = 45
    raw_insp.hours = 2
    raw_insp.save()
    print(f"   ✓ Updated RAW: {raw_insp.product_name}")
except FoodSafetyAgencyInspection.DoesNotExist:
    print("\n2. Creating RAW inspection...")
    # Create RAW inspection
    raw_insp = FoodSafetyAgencyInspection.objects.create(
        remote_id=-1000,
        client=poultry_insp.client,
        client_name=poultry_insp.client_name,
        date_of_inspection=poultry_insp.date_of_inspection,
        commodity='RAW',
        product_name='Beef Mince',
        product_class='Beef Mince',
        lab='Lab A',
        inspector_name=poultry_insp.inspector_name,
        is_sample_taken=True,
        fat=True,
        protein=True,
        calcium=False,
        dna=False,
        bought_sample=500,
        km_traveled=45,
        hours=2,
        town=poultry_insp.town,
        is_manual=True,
        internal_account_code=poultry_insp.internal_account_code,
        facility_type=poultry_insp.facility_type,
        group_type=poultry_insp.group_type,
        corporate_group=poultry_insp.corporate_group,
    )
    print(f"   ✓ Created RAW: {raw_insp.product_name}")

# Check if PMP exists
pmp_exists = FoodSafetyAgencyInspection.objects.filter(
    client_name=poultry_insp.client_name,
    date_of_inspection=poultry_insp.date_of_inspection,
    internal_account_code=poultry_insp.internal_account_code,
    commodity='PMP'
).exists()

if not pmp_exists:
    print("\n3. Creating PMP inspection...")
    pmp_insp = FoodSafetyAgencyInspection.objects.create(
        remote_id=-1001,
        client=poultry_insp.client,
        client_name=poultry_insp.client_name,
        date_of_inspection=poultry_insp.date_of_inspection,
        commodity='PMP',
        product_name='Polony',
        product_class='Comminuted, cured and heat treated products',
        lab='Lab B',
        inspector_name=poultry_insp.inspector_name,
        is_sample_taken=True,
        fat=True,
        protein=True,
        calcium=True,
        dna=False,
        bought_sample=250,
        km_traveled=45,
        hours=2,
        town=poultry_insp.town,
        is_manual=True,
        internal_account_code=poultry_insp.internal_account_code,
        facility_type=poultry_insp.facility_type,
        group_type=poultry_insp.group_type,
        corporate_group=poultry_insp.corporate_group,
    )
    print(f"   ✓ Created PMP: {pmp_insp.product_name}")
else:
    print("\n3. PMP inspection already exists, skipping...")

# Check if EGGS exists
eggs_exists = FoodSafetyAgencyInspection.objects.filter(
    client_name=poultry_insp.client_name,
    date_of_inspection=poultry_insp.date_of_inspection,
    internal_account_code=poultry_insp.internal_account_code,
    commodity='EGGS'
).exists()

if not eggs_exists:
    print("\n4. Creating EGGS inspection...")
    eggs_insp = FoodSafetyAgencyInspection.objects.create(
        remote_id=-1002,
        client=poultry_insp.client,
        client_name=poultry_insp.client_name,
        date_of_inspection=poultry_insp.date_of_inspection,
        commodity='EGGS',
        product_name='Large Eggs',
        product_class='Class A',
        lab='Lab C',
        inspector_name=poultry_insp.inspector_name,
        is_sample_taken=True,
        fat=False,
        protein=True,
        calcium=True,
        dna=False,
        bought_sample=1000,
        km_traveled=45,
        hours=2,
        town=poultry_insp.town,
        is_manual=True,
        internal_account_code=poultry_insp.internal_account_code,
        facility_type=poultry_insp.facility_type,
        group_type=poultry_insp.group_type,
        corporate_group=poultry_insp.corporate_group,
    )
    print(f"   ✓ Created EGGS: {eggs_insp.product_name}")
else:
    print("\n4. EGGS inspection already exists, skipping...")

# Verify all 4 commodities exist
print("\n" + "-"*80)
print("VERIFICATION")
print("-"*80)

all_inspections = FoodSafetyAgencyInspection.objects.filter(
    client_name=poultry_insp.client_name,
    date_of_inspection=poultry_insp.date_of_inspection,
    internal_account_code=poultry_insp.internal_account_code
).order_by('commodity')

print(f"\nAll inspections for {poultry_insp.client_name} on {poultry_insp.date_of_inspection}:")
print(f"Account Code: {poultry_insp.internal_account_code}\n")

for insp in all_inspections:
    print(f"  {insp.commodity}:")
    print(f"    ID: {insp.id}")
    print(f"    Product: {insp.product_name}")
    print(f"    Class: {insp.product_class}")
    print(f"    Lab: {insp.lab}")
    print()

commodities = set(insp.commodity for insp in all_inspections)
if commodities == {'POULTRY', 'RAW', 'PMP', 'EGGS'}:
    print("✅ All 4 commodities present!")
else:
    print(f"⚠ Only {len(commodities)}/4 commodities: {', '.join(sorted(commodities))}")

# Check account codes
account_codes = set(insp.internal_account_code for insp in all_inspections)
if len(account_codes) == 1:
    print(f"✅ All share same account code: {list(account_codes)[0]}")
else:
    print(f"❌ Multiple account codes: {account_codes}")

print("\n" + "="*80)
print("✅ COMPLETE!")
print("="*80)
print(f"\nCreated/Updated all 4 commodities for Spar inspection")
print(f"All share account code: {poultry_insp.internal_account_code}")
print(f"They will appear as ONE group in shipment list")
print("="*80)
