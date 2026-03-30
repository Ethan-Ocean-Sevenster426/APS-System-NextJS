"""
Fix inspections labeled as 'API User' by matching them to system log CREATE entries.

Run on the server:
  cd /var/www/APS-System
  python manage.py shell < fix_api_user.py
"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Only call setup if not already configured (manage.py shell already does it)
try:
    django.setup()
except RuntimeError:
    pass

from main.models import FoodSafetyAgencyInspection, SystemLog
from django.contrib.auth import get_user_model
from datetime import timedelta

User = get_user_model()

# 1. Find all "API User" inspections
api_inspections = FoodSafetyAgencyInspection.objects.filter(
    inspector_name='API User'
).select_related('inspection_group').order_by('date_of_inspection')

total = api_inspections.count()
print(f"\n{'='*60}")
print(f"Found {total} inspections with inspector_name='API User'")
print(f"{'='*60}\n")

if total == 0:
    print("Nothing to fix!")
    sys.exit(0)

# 2. Get all CREATE log entries for add-inspection
create_logs = SystemLog.objects.filter(
    action='CREATE',
    page__icontains='add-inspection'
).select_related('user').order_by('timestamp')

print(f"Found {create_logs.count()} CREATE log entries for add-inspection\n")

# Build a lookup: group inspections by group_id, find matching log by timestamp
# Group the API User inspections by their group
from collections import defaultdict
groups = defaultdict(list)
for insp in api_inspections:
    gid = insp.inspection_group_id
    if gid:
        groups[gid].append(insp)

print(f"Grouped into {len(groups)} inspection groups\n")

# For each group, try to find who created it by matching system logs
fixed = 0
not_found = 0

for group_id, inspections in groups.items():
    first_insp = inspections[0]
    client_name = first_insp.client_name or ""
    insp_date = first_insp.date_of_inspection

    # Try to find a matching system log entry
    # Look for CREATE logs that mention this client name within a reasonable time window
    matching_logs = create_logs.filter(
        description__icontains=client_name[:30]  # partial match on client name
    ) if client_name else None

    if not matching_logs or not matching_logs.exists():
        # Fallback: match by timestamp - find CREATE logs close to when group was created
        # Use the inspection group's created_at if available
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

        # Update all inspections in this group
        count = FoodSafetyAgencyInspection.objects.filter(
            inspection_group_id=group_id,
            inspector_name='API User'
        ).update(inspector_name=real_name)

        print(f"  [FIXED] Group {group_id}: '{client_name}' ({insp_date}) -> {real_name} ({count} records)")
        fixed += count
    else:
        print(f"  [SKIP]  Group {group_id}: '{client_name}' ({insp_date}) - no matching log found")
        not_found += len(inspections)

print(f"\n{'='*60}")
print(f"RESULTS:")
print(f"  Fixed:     {fixed} inspections")
print(f"  Skipped:   {not_found} inspections (no matching log)")
print(f"  Total:     {total}")
print(f"{'='*60}\n")

# Show remaining API User inspections if any
remaining = FoodSafetyAgencyInspection.objects.filter(inspector_name='API User').count()
if remaining > 0:
    print(f"⚠ {remaining} inspections still have 'API User'. These may need manual review.")
    # List them for manual fixing
    for insp in FoodSafetyAgencyInspection.objects.filter(inspector_name='API User').values('id', 'client_name', 'date_of_inspection').distinct()[:20]:
        print(f"    ID={insp['id']}: {insp['client_name']} ({insp['date_of_inspection']})")
else:
    print("All 'API User' inspections have been fixed!")
