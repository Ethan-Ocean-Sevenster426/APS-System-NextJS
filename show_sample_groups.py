#!/usr/bin/env python
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from django.db.models import Count, Min

print("\n" + "="*80)
print("SAMPLE INSPECTION GROUPS FOR TESTING")
print("="*80)

groups = FoodSafetyAgencyInspection.objects.values(
    'client_name',
    'date_of_inspection',
    'internal_account_code'
).annotate(
    count=Count('id'),
    first_id=Min('id')
).order_by('-date_of_inspection')[:10]

for i, group in enumerate(groups, 1):
    inspections = FoodSafetyAgencyInspection.objects.filter(
        client_name=group['client_name'],
        date_of_inspection=group['date_of_inspection'],
        internal_account_code=group['internal_account_code']
    ).order_by('inspection_sequence')
    
    print(f"\n{i}. {group['client_name']}")
    print(f"   Date: {group['date_of_inspection']}")
    print(f"   Account Code: {group['internal_account_code']}")
    print(f"   Edit URL: /inspections/edit-fsa/{group['first_id']}/")
    print(f"   Inspections ({group['count']}):")
    
    for insp in inspections:
        print(f"      Seq #{insp.inspection_sequence}: {insp.commodity:8} - {insp.product_name:25} (ID {insp.id})")

print("\n" + "="*80)
print("READY FOR TESTING!")
print("="*80)
print("""
Now you can:
1. Go to shipment list: http://127.0.0.1:8000/inspections/shipment-list/
2. Click "Edit" on any group
3. Add/remove commodities
4. Save and see changes reflect properly

All inspections use the NEW system:
- Account codes have NO commodity (5 parts)
- Each commodity has sequence number (1, 2, 3, 4...)
- Sequences automatically adjust when you add/delete
""")
print("="*80)
