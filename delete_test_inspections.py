#!/usr/bin/env python
"""Delete test inspections created by test_inspector"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectionGroup

print("=" * 80)
print("DELETING TEST INSPECTIONS")
print("=" * 80)

# Find all inspections for test_inspector
test_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspector_name__icontains='test'
)

print(f"\nFound {test_inspections.count()} test inspections:")
for inspection in test_inspections:
    print(f"  - {inspection.client_name} ({inspection.date_of_inspection}) - ID: {inspection.id}")

# Get the inspection groups for these inspections
group_ids = set()
for inspection in test_inspections:
    if inspection.inspection_group_id:
        group_ids.add(inspection.inspection_group_id)

print(f"\nFound {len(group_ids)} inspection groups to delete")

# Delete the inspections
deleted_count = test_inspections.count()
test_inspections.delete()
print(f"\n✅ Deleted {deleted_count} test inspections")

# Delete the orphaned inspection groups
if group_ids:
    deleted_groups = InspectionGroup.objects.filter(id__in=group_ids).delete()
    print(f"✅ Deleted {deleted_groups[0]} inspection groups")

print("=" * 80)
print("CLEANUP COMPLETE")
print("=" * 80)
