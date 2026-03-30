"""
Fix inspections labeled as 'API User' by matching them to system log CREATE entries.

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

from main.models import FoodSafetyAgencyInspection, SystemLog
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

# 1. Find all "API User" inspections
api_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspector_name='API User'
).select_related('inspection_group').order_by('date_of_inspection')

total = api_inspections.count()
print(f"Found {total} inspections with inspector_name='API User'")

if total == 0:
    print("Nothing to fix!")
    sys.exit(0)

# 2. Get all CREATE log entries for add-inspection
create_logs = SystemLog.objects.filter(
    action='CREATE',
    page__icontains='add-inspection'
).select_related('user').order_by('timestamp')

print(f"Found {create_logs.count()} CREATE log entries for add-inspection\n")

# Group the API User inspections by their group_id
groups = defaultdict(list)
for insp in api_inspections:
    gid = insp.inspection_group_id
    if gid:
        groups[gid].append(insp)

print(f"Grouped into {len(groups)} inspection groups\n")
print(f"{'─'*60}")

# For each group, try to find who created it
would_fix = 0
would_skip = 0
fixed = 0

for group_id, inspections in groups.items():
    first_insp = inspections[0]
    client_name = first_insp.client_name or ""
    insp_date = first_insp.date_of_inspection
    num_records = len(inspections)

    # Strategy 1: Match by client name in log description
    matching_logs = None
    if client_name:
        matching_logs = create_logs.filter(
            description__icontains=client_name[:30]
        )

    # Strategy 2: Match by timestamp window around group creation
    if not matching_logs or not matching_logs.exists():
        group = first_insp.inspection_group
        if group and hasattr(group, 'created_at') and group.created_at:
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
            print(f"              -> '{real_name}' ({num_records} records)")
            would_fix += num_records
        else:
            count = FoodSafetyAgencyInspection.objects.filter(
                inspection_group_id=group_id,
                inspector_name='API User'
            ).update(inspector_name=real_name)
            print(f"  [FIXED]     Group {group_id}: '{client_name}' ({insp_date})")
            print(f"              -> '{real_name}' ({count} records)")
            fixed += count
    else:
        print(f"  [SKIP]      Group {group_id}: '{client_name}' ({insp_date}) - no matching log ({num_records} records)")
        would_skip += num_records

print(f"\n{'='*60}")
print(f"RESULTS:")
if DRY_RUN:
    print(f"  Would fix:   {would_fix} inspections")
    print(f"  Would skip:  {would_skip} inspections (no matching log)")
    print(f"  Total:       {total}")
    print(f"\n  >>> Run with APPLY=1 to apply these changes <<<")
else:
    print(f"  Fixed:       {fixed} inspections")
    print(f"  Skipped:     {would_skip} inspections (no matching log)")
    print(f"  Total:       {total}")

    remaining = FoodSafetyAgencyInspection.objects.filter(inspector_name='API User').count()
    if remaining > 0:
        print(f"\n  {remaining} inspections still have 'API User'. Manual review needed:")
        for insp in FoodSafetyAgencyInspection.objects.filter(inspector_name='API User').values('id', 'client_name', 'date_of_inspection')[:20]:
            print(f"    ID={insp['id']}: {insp['client_name']} ({insp['date_of_inspection']})")
    else:
        print(f"\n  All 'API User' inspections have been fixed!")
print(f"{'='*60}\n")
