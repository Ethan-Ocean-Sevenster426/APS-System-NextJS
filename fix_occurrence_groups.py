#!/usr/bin/env python3
"""
Fix existing occurrence reports by giving each a unique inspection_group.
This prevents multiple occurrence reports from being grouped together
and having their sent status changed together.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection

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

# Also reset is_sent to False for all of them so user can re-set correctly
fixed_count = 0
for report in occurrence_reports:
    # Create unique group ID using the report's primary key
    unique_group = f"OCC_{report.id}_{report.remote_id or 0}"

    # Only update if inspection_group is empty/null or doesn't start with OCC_
    if not report.inspection_group or not report.inspection_group.startswith('OCC_'):
        report.inspection_group = unique_group
        report.is_sent = False  # Reset sent status
        report.sent_date = None
        report.sent_by = None
        report.save(update_fields=['inspection_group', 'is_sent', 'sent_date', 'sent_by'])
        fixed_count += 1
        print(f"  Fixed: {report.client_name} ({report.date_of_inspection}) -> {unique_group}")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"Fixed: {fixed_count} occurrence reports")
print(f"Each occurrence report now has a unique inspection_group")
print(f"Sent status has been reset - please re-mark as sent as needed")
print("="*80 + "\n")
