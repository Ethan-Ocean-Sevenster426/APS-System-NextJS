#!/usr/bin/env python
"""
Data migration: Populate inspection_sequence and update internal_account_code format
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from django.db.models import Count

print("\n" + "="*80)
print("DATA MIGRATION: INSPECTION SEQUENCES & ACCOUNT CODE FORMAT")
print("="*80)

# Step 1: Group existing inspections and assign sequences
print("\n" + "-"*80)
print("STEP 1: ASSIGN SEQUENCES TO EXISTING INSPECTIONS")
print("-"*80)

groups = FoodSafetyAgencyInspection.objects.values(
    'client_name',
    'date_of_inspection',
    'internal_account_code'
).annotate(
    count=Count('id')
).filter(
    internal_account_code__isnull=False
).order_by('client_name', 'date_of_inspection', 'internal_account_code')

print(f"\nFound {groups.count()} inspection groups")

total_updated = 0

for group in groups:
    client = group['client_name']
    date = group['date_of_inspection']
    code = group['internal_account_code']
    count = group['count']

    # Get inspections in this group
    inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name=client,
        date_of_inspection=date,
        internal_account_code=code
    ).order_by('id')  # Order by ID to maintain creation order

    # Assign sequences
    for seq_num, insp in enumerate(inspections, start=1):
        insp.inspection_sequence = seq_num
        insp.save(update_fields=['inspection_sequence'])
        total_updated += 1

    print(f"  Processed group: {client[:30]:30} | {date} | {count} inspections")

print(f"\n✓ Updated {total_updated} inspections with sequences")

# Step 2: Update account codes to remove commodity part
print("\n" + "-"*80)
print("STEP 2: UPDATE ACCOUNT CODE FORMAT (REMOVE COMMODITY)")
print("-"*80)

# Find all inspections with old format (contains commodity)
# Old format: FA-IND-EGG-NA-0036-001 (6 parts)
# New format: FA-IND-NA-0036-001 (5 parts)

inspections_to_update = []

for insp in FoodSafetyAgencyInspection.objects.filter(internal_account_code__isnull=False):
    code_parts = insp.internal_account_code.split('-')
    
    # Check if old format (6 parts with commodity)
    if len(code_parts) == 6:
        # Remove commodity part (index 2)
        # FA-IND-EGG-NA-0036-001 -> FA-IND-NA-0036-001
        new_code_parts = [code_parts[0], code_parts[1], code_parts[3], code_parts[4], code_parts[5]]
        new_code = '-'.join(new_code_parts)
        
        inspections_to_update.append((insp, insp.internal_account_code, new_code))

if inspections_to_update:
    print(f"\nFound {len(inspections_to_update)} inspections with old format")
    print("\nPreview of changes:")
    for insp, old_code, new_code in inspections_to_update[:5]:
        print(f"  {old_code} -> {new_code}")
    
    response = input(f"\nUpdate {len(inspections_to_update)} account codes? (yes/no): ")
    
    if response.lower() == 'yes':
        for insp, old_code, new_code in inspections_to_update:
            insp.internal_account_code = new_code
            insp.save(update_fields=['internal_account_code'])
        print(f"\n✓ Updated {len(inspections_to_update)} account codes")
    else:
        print("\n✗ Skipped account code update")
else:
    print("\n✓ All account codes already in new format")

print("\n" + "="*80)
print("MIGRATION COMPLETE")
print("="*80)

# Summary
final_inspections = FoodSafetyAgencyInspection.objects.filter(internal_account_code__isnull=False)
print(f"\nTotal inspections: {final_inspections.count()}")
print(f"Inspections with sequences: {final_inspections.filter(inspection_sequence__gt=0).count()}")

# Show sample
sample_group = final_inspections.values(
    'client_name',
    'date_of_inspection',
    'internal_account_code'
).annotate(count=Count('id')).first()

if sample_group:
    print(f"\nSample group:")
    print(f"  Client: {sample_group['client_name']}")
    print(f"  Date: {sample_group['date_of_inspection']}")
    print(f"  Code: {sample_group['internal_account_code']}")
    
    sample_inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name=sample_group['client_name'],
        date_of_inspection=sample_group['date_of_inspection'],
        internal_account_code=sample_group['internal_account_code']
    ).order_by('inspection_sequence')
    
    for insp in sample_inspections:
        print(f"    #{insp.inspection_sequence}: {insp.commodity:8} - {insp.product_name}")

print("\n" + "="*80)
