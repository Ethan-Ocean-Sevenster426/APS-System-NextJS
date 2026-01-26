#!/usr/bin/env python3
"""
Populate default inspection fees and their history
"""
import os
import sys
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import InspectionFee, FeeHistory
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*80)
print("POPULATE DEFAULT INSPECTION FEES")
print("="*80)

# Get admin user for created_by field
admin_user = User.objects.filter(role='admin').first()
if not admin_user:
    admin_user = User.objects.first()

if not admin_user:
    print("⚠️  No users found - fees will be created without a creator")

# Default fees to create
DEFAULT_FEES = [
    {
        'fee_code': 'inspection_hour_rate',
        'fee_name': 'Inspection Hour Rate',
        'rate': 350.00,
        'description': 'Hourly rate for inspection services'
    },
    {
        'fee_code': 'inspection_km_rate',
        'fee_name': 'Travel Rate per KM',
        'rate': 5.50,
        'description': 'Cost per kilometer traveled for inspections'
    },
    {
        'fee_code': 'poultry_inspection',
        'fee_name': 'Poultry Inspection Fee',
        'rate': 250.00,
        'description': 'Standard fee for poultry product inspection'
    },
    {
        'fee_code': 'raw_meat_inspection',
        'fee_name': 'Raw Meat Inspection Fee',
        'rate': 300.00,
        'description': 'Standard fee for raw meat product inspection'
    },
    {
        'fee_code': 'pmp_inspection',
        'fee_name': 'PMP Inspection Fee',
        'rate': 275.00,
        'description': 'Standard fee for processed meat product inspection'
    },
    {
        'fee_code': 'eggs_inspection',
        'fee_name': 'Eggs Inspection Fee',
        'rate': 200.00,
        'description': 'Standard fee for egg product inspection'
    },
    {
        'fee_code': 'lab_test_fat',
        'fee_name': 'Fat Content Test',
        'rate': 150.00,
        'description': 'Laboratory testing fee for fat content analysis'
    },
    {
        'fee_code': 'lab_test_protein',
        'fee_name': 'Protein Content Test',
        'rate': 150.00,
        'description': 'Laboratory testing fee for protein content analysis'
    },
    {
        'fee_code': 'lab_test_calcium',
        'fee_name': 'Calcium Content Test',
        'rate': 120.00,
        'description': 'Laboratory testing fee for calcium content analysis'
    },
    {
        'fee_code': 'lab_test_dna',
        'fee_name': 'DNA Species Test',
        'rate': 450.00,
        'description': 'Laboratory testing fee for DNA species identification'
    },
    {
        'fee_code': 'sample_collection',
        'fee_name': 'Sample Collection Fee',
        'rate': 50.00,
        'description': 'Fee for collecting product samples'
    },
    {
        'fee_code': 'retest_fee',
        'fee_name': 'Re-test Fee',
        'rate': 200.00,
        'description': 'Fee for re-testing non-compliant products'
    },
]

print(f"\n📋 Creating {len(DEFAULT_FEES)} default fees...\n")

created_count = 0
updated_count = 0
effective_date = date.today()

for fee_data in DEFAULT_FEES:
    fee_code = fee_data['fee_code']

    # Check if fee already exists
    existing_fee = InspectionFee.objects.filter(fee_code=fee_code).first()

    if existing_fee:
        print(f"⚠️  Fee '{fee_code}' already exists - updating rate to R{fee_data['rate']}")
        existing_fee.rate = fee_data['rate']
        existing_fee.fee_name = fee_data['fee_name']
        existing_fee.description = fee_data['description']
        existing_fee.updated_by = admin_user
        existing_fee.save()

        # Create history entry if it doesn't exist for today
        history_exists = FeeHistory.objects.filter(
            fee=existing_fee,
            effective_date=effective_date
        ).exists()

        if not history_exists:
            FeeHistory.objects.create(
                fee=existing_fee,
                rate=fee_data['rate'],
                effective_date=effective_date,
                created_by=admin_user,
                notes='Default fee rate initialized'
            )
            print(f"   ✓ Created history entry for {effective_date}")

        updated_count += 1
    else:
        # Create new fee
        fee = InspectionFee.objects.create(
            fee_code=fee_code,
            fee_name=fee_data['fee_name'],
            rate=fee_data['rate'],
            description=fee_data['description'],
            updated_by=admin_user
        )

        # Create initial history entry
        FeeHistory.objects.create(
            fee=fee,
            rate=fee_data['rate'],
            effective_date=effective_date,
            created_by=admin_user,
            notes='Initial fee rate'
        )

        print(f"✅ Created fee '{fee_code}': {fee_data['fee_name']} - R{fee_data['rate']}")
        created_count += 1

# Summary
print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"✅ Created: {created_count} new fees")
print(f"🔄 Updated: {updated_count} existing fees")
print(f"📊 Total fees in database: {InspectionFee.objects.count()}")
print(f"📜 Total fee history records: {FeeHistory.objects.count()}")
print(f"\nEffective date for all fees: {effective_date}")
print("\n✅ Default fees have been populated successfully!")
print("="*80 + "\n")
