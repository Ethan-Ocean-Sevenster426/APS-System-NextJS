#!/usr/bin/env python
"""Link inspections to their inspection groups based on matching fields"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectionGroup
from django.db.models import Q

print("=" * 80)
print("LINKING INSPECTIONS TO INSPECTION GROUPS")
print("=" * 80)

# Get all inspection groups
groups = InspectionGroup.objects.all()
print(f"\nTotal inspection groups: {groups.count()}")

linked_count = 0
skipped_count = 0
total_inspections_linked = 0

for group in groups:
    # Find inspections that match this group
    # Match on: inspector_name, client_name, date_of_inspection
    matching_inspections = FoodSafetyAgencyInspection.objects.filter(
        inspector_name=group.inspector_name,
        client_name=group.client_name,
        date_of_inspection=group.date_of_inspection,
        inspection_group__isnull=True  # Only link inspections that aren't already linked
    )

    count = matching_inspections.count()

    if count > 0:
        # Link all matching inspections to this group
        matching_inspections.update(inspection_group=group)
        linked_count += 1
        total_inspections_linked += count
        print(f"✅ Linked {count} inspection(s) to group {group.id} ({group.inspector_name}, {group.client_name}, {group.date_of_inspection})")
    else:
        skipped_count += 1

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Groups processed: {groups.count()}")
print(f"Groups with inspections linked: {linked_count}")
print(f"Groups with no matching inspections: {skipped_count}")
print(f"Total inspections linked: {total_inspections_linked}")

# Verify the results
inspections_with_groups = FoodSafetyAgencyInspection.objects.exclude(inspection_group__isnull=True).count()
print(f"\n✅ Inspections now linked to groups: {inspections_with_groups}")

# Check travel time data availability
from datetime import datetime, timedelta
from django.db.models import Count

groups_with_times = InspectionGroup.objects.filter(
    travel_start_time__isnull=False,
    travel_end_time__isnull=False
)

inspections_with_travel_times = FoodSafetyAgencyInspection.objects.filter(
    inspection_group__travel_start_time__isnull=False,
    inspection_group__travel_end_time__isnull=False
).exclude(
    Q(inspector_name__isnull=True) | Q(inspector_name='') | Q(inspector_name='Unknown')
).count()

print(f"✅ Inspections with travel time data: {inspections_with_travel_times}")

print("\n" + "=" * 80)
