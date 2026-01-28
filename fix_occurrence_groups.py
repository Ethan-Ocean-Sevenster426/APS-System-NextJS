#!/usr/bin/env python3
"""
Fix existing occurrence reports by giving each a unique InspectionGroup.
This prevents multiple occurrence reports from being grouped together
and having their sent status changed together.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectionGroup

print("\n" + "="*80)
print("FIX OCCURRENCE REPORT GROUPS")
print("="*80)

# Find all occurrence reports without a unique inspection_group
occurrence_reports = FoodSafetyAgencyInspection.objects.filter(
    is_occurrence_report=True
) | FoodSafetyAgencyInspection.objects.filter(
    occurrence_report=True
)

print(f"\nFound {occurrence_reports.count()} occurrence reports")

# Fix each occurrence report
fixed_count = 0
for report in occurrence_reports:
    # Only fix if inspection_group is not set
    if not report.inspection_group:
        # Create a unique InspectionGroup for this occurrence report
        new_group = InspectionGroup.objects.create(
            client_name=report.client_name or 'Unknown',
            date_of_inspection=report.date_of_inspection,
            inspector_name=report.inspector_name,
            town=report.town,
            facility_type=report.facility_type,
            group_type=report.group_type,
            corporate_group=report.corporate_group,
            additional_email=report.additional_email,
            is_manual=True,
        )

        # Assign the group and reset sent status
        report.inspection_group = new_group
        report.is_sent = False  # Reset sent status
        report.sent_date = None
        report.sent_by = None
        report.save(update_fields=['inspection_group', 'is_sent', 'sent_date', 'sent_by'])
        fixed_count += 1
        print(f"  Fixed: {report.client_name} ({report.date_of_inspection}) -> Group #{new_group.id}")
    else:
        print(f"  Skipped: {report.client_name} ({report.date_of_inspection}) - already has group #{report.inspection_group.id}")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Fixed: {fixed_count} occurrence reports")
print(f"Each occurrence report now has a unique InspectionGroup")
print(f"Sent status has been reset - please re-mark as sent as needed")
print("="*80 + "\n")
