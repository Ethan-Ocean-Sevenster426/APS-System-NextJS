"""
Fix inspections AND inspection groups labeled as 'API User'.

DRY RUN (preview only, no changes):
  cd /var/www/APS-System
  python manage.py shell < fix_api_user.py

ACTUAL RUN (applies changes):
  cd /var/www/APS-System
  APPLY=1 python manage.py shell < fix_api_user.py
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    django.setup()
except RuntimeError:
    pass

from main.models import FoodSafetyAgencyInspection, InspectionGroup, SystemLog
from django.contrib.auth import get_user_model
from datetime import timedelta
from collections import defaultdict

User = get_user_model()

DRY_RUN = os.environ.get('APPLY', '') != '1'

print(f"\n{'='*60}")
if DRY_RUN:
    print("  MODE: DRY RUN (no changes will be made)")
    print("  To apply changes: APPLY=1 python manage.py shell < fix_api_user.py")
else:
    print("  MODE: LIVE RUN (changes WILL be applied)")
print(f"{'='*60}\n")

# 1. Find all "API User" in both models
api_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspector_name='API User'
).select_related('inspection_group').order_by('date_of_inspection')

api_groups = InspectionGroup.objects.filter(inspector_name='API User')

insp_total = api_inspections.count()
group_total = api_groups.count()

print(f"Found {insp_total} inspections with inspector_name='API User'")
print(f"Found {group_total} inspection GROUPS with inspector_name='API User'")

if insp_total == 0 and group_total == 0:
    print("\nNothing to fix!")
    sys.exit(0)

# 2. Get all CREATE log entries for add-inspection
create_logs = SystemLog.objects.filter(
    action='CREATE',
    page__icontains='add-inspection'
).select_related('user').order_by('timestamp')

print(f"Found {create_logs.count()} CREATE log entries for add-inspection\n")

# 3. Collect all affected group IDs from both sources
affected_group_ids = set()
for insp in api_inspections:
    if insp.inspection_group_id:
        affected_group_ids.add(insp.inspection_group_id)
for grp in api_groups:
    affected_group_ids.add(grp.id)

print(f"Total affected groups: {len(affected_group_ids)}\n")
print(f"{'─'*60}")

# 4. For each group, find who created it
fixed_inspections = 0
fixed_groups = 0
skipped = 0

for group_id in affected_group_ids:
    group = InspectionGroup.objects.filter(id=group_id).first()
    if not group:
        continue

    client_name = group.client_name or ""
    insp_date = group.date_of_inspection

    # Count records in this group
    insp_count = FoodSafetyAgencyInspection.objects.filter(
        inspection_group_id=group_id, inspector_name='API User'
    ).count()
    group_is_api = (group.inspector_name == 'API User')

    # Strategy 1: Match by client name in log description
    matching_logs = None
    if client_name:
        matching_logs = create_logs.filter(
            description__icontains=client_name[:30]
        )

    # Strategy 2: Match by timestamp window around group creation
    if not matching_logs or not matching_logs.exists():
        if hasattr(group, 'created_at') and group.created_at:
            window_start = group.created_at - timedelta(minutes=2)
            window_end = group.created_at + timedelta(minutes=2)
            matching_logs = create_logs.filter(
                timestamp__gte=window_start,
                timestamp__lte=window_end
            )

    if matching_logs and matching_logs.exists():
        log_entry = matching_logs.first()
        user = log_entry.user
        real_name = f"{user.first_name} {user.last_name}".strip() or user.username

        if DRY_RUN:
            print(f"  [WOULD FIX] Group {group_id}: '{client_name}' ({insp_date})")
            print(f"              -> '{real_name}' (group={'YES' if group_is_api else 'already ok'}, {insp_count} inspections)")
            fixed_inspections += insp_count
            if group_is_api:
                fixed_groups += 1
        else:
            # Fix the InspectionGroup
            if group_is_api:
                InspectionGroup.objects.filter(id=group_id, inspector_name='API User').update(inspector_name=real_name)
                fixed_groups += 1

            # Fix the child inspections
            count = FoodSafetyAgencyInspection.objects.filter(
                inspection_group_id=group_id, inspector_name='API User'
            ).update(inspector_name=real_name)
            fixed_inspections += count

            print(f"  [FIXED]     Group {group_id}: '{client_name}' ({insp_date})")
            print(f"              -> '{real_name}' (group={'FIXED' if group_is_api else 'ok'}, {count} inspections)")
    else:
        skip_count = insp_count + (1 if group_is_api else 0)
        print(f"  [SKIP]      Group {group_id}: '{client_name}' ({insp_date}) - no matching log")
        skipped += skip_count

print(f"\n{'='*60}")
print(f"RESULTS:")
if DRY_RUN:
    print(f"  Would fix groups:      {fixed_groups}")
    print(f"  Would fix inspections: {fixed_inspections}")
    print(f"  Would skip:            {skipped}")
    print(f"\n  >>> Run with APPLY=1 to apply these changes <<<")
else:
    print(f"  Fixed groups:      {fixed_groups}")
    print(f"  Fixed inspections: {fixed_inspections}")
    print(f"  Skipped:           {skipped}")

    remaining_groups = InspectionGroup.objects.filter(inspector_name='API User').count()
    remaining_inspections = FoodSafetyAgencyInspection.objects.filter(inspector_name='API User').count()

    if remaining_groups > 0 or remaining_inspections > 0:
        print(f"\n  Remaining: {remaining_groups} groups, {remaining_inspections} inspections still 'API User'")
        for g in InspectionGroup.objects.filter(inspector_name='API User')[:10]:
            print(f"    Group {g.id}: {g.client_name} ({g.date_of_inspection})")
    else:
        print(f"\n  All 'API User' records have been fixed!")
print(f"{'='*60}\n")
