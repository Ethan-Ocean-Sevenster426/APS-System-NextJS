#!/usr/bin/env python
"""
Show current database state with new parent-child system
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import InspectionGroup, FoodSafetyAgencyInspection

print("\n" + "="*80)
print("CURRENT DATABASE STATE - PARENT-CHILD SYSTEM")
print("="*80)

# Show all groups
groups = InspectionGroup.objects.all().order_by('-created_at')

print(f"\nTotal Inspection Groups: {groups.count()}\n")

for group in groups:
    print(f"{'='*80}")
    print(f"PARENT GROUP #{group.id}")
    print(f"{'='*80}")
    print(f"  Client: {group.client_name}")
    print(f"  Date: {group.date_of_inspection}")
    print(f"  Inspector: {group.inspector_name}")
    print(f"  Location: {group.town}")
    print(f"  KM: {group.km_traveled} | Hours: {group.hours}")
    print(f"  Email: {group.additional_email}")
    
    print(f"\n  CHILDREN ({group.inspections.count()} inspections):")
    print(f"  {'-'*76}")

    for inspection in group.inspections.all().order_by('inspection_sequence'):
        print(f"    Seq #{inspection.inspection_sequence}: {inspection.commodity:10} - {inspection.product_name:30}")
        print(f"             Tests: Fat={inspection.fat}, Protein={inspection.protein}, Calcium={inspection.calcium}, DNA={inspection.dna}")
        print()

print("="*80)
print("READY TO TEST IN BROWSER")
print("="*80)
print("""
✅ Database is ready!

Go to: http://127.0.0.1:8000/inspections/shipment-list/

Expected: ONE entry for Woolworths with 4 commodities

Make sure Django server is restarted:
  1. Stop server (Ctrl+C)
  2. Start: venv/bin/python manage.py runserver
""")
print("="*80)
