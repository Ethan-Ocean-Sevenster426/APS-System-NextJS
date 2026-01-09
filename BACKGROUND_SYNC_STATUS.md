# Background Sync Status Report

## Current Configuration

✅ **Auto Sync is NOW ENABLED** (was disabled before)

### System Settings:
- **Auto Sync Enabled**: `True`
- **Sync Interval**: `24 hours`
- **Google Sheets Enabled**: `True`
- **SQL Server Enabled**: `True`
- **OneDrive Auto Sync**: `True`
- **OneDrive Sync Interval**: `2 hours`

## What the Background Sync Does

The background sync service automatically:

1. **Google Sheets Sync** (every 24 hours)
   - Refreshes client names from Google Sheets
   - Updates client email addresses
   - Updates internal account codes

2. **SQL Server Sync** (every 24 hours)
   - Fetches new inspections from SQL Server
   - Matches clients with Google Sheets data
   - Syncs product names
   - Updates inspection data

3. **Auto-Restart**
   - Service auto-restarts if Django server restarts
   - Persists across page refreshes
   - Runs in background thread

## How It Works

The service runs in a background thread and:
- Checks every few minutes if a sync is due
- Runs syncs based on configured intervals
- Saves last sync times to cache
- Provides status via API endpoints

## Service Starts Automatically When:

1. Django server starts
2. Any page loads (if service was running before)
3. Settings page is accessed
4. Manual sync is triggered

## How to Verify It's Working

### Method 1: Check Django Console
Look for these messages in the Django console:
```
[OK] Scheduled sync service started successfully
 Starting Google Sheets sync...
 Starting SQL Server sync...
```

### Method 2: Check Admin Settings Page
- Go to admin panel
- Navigate to System Settings
- Look for "Auto Sync Status" indicator

### Method 3: Check Database
Run this query to see if new inspections are being synced:
```sql
SELECT COUNT(*) FROM main_foodsafetyagencyinspection
WHERE date_of_inspection >= CURRENT_DATE - 7;
```

### Method 4: Manual Sync Test
- Go to Settings page in the web interface
- Click "Run Manual Sync" button
- Check console for sync progress messages

## Troubleshooting

### If Service Won't Start:

1. **Check SystemSettings**
   ```python
   python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings'); django.setup(); from main.models import SystemSettings; s = SystemSettings.objects.first(); print(f'Auto Sync: {s.auto_sync_enabled}, Interval: {s.sync_interval_hours}h')"
   ```

2. **Check for errors in Django console**
   - Look for traceback errors
   - Check if SQL Server connection is working
   - Verify Google Sheets API is authenticated

3. **Restart Django server**
   - Service should auto-start on restart
   - Check console for startup messages

### If Syncs Aren't Running:

1. **Check sync interval**
   - Default is 24 hours
   - Service won't run if interval is 0 or negative

2. **Check last sync time**
   - Service only runs if enough time has passed
   - First sync runs immediately after service starts

3. **Force a manual sync**
   - Use settings page manual sync button
   - Or run via Python: `scheduled_sync_service.run_manual_sync('all')`

## Files Modified

### Today's Changes:

1. **main/views/core_views.py** (lines 1033, 1432, 1453, 1483-1487, 1619)
   - Added `approved_status` field to queryset
   - Added to representative_inspection dictionary
   - Now passes to template correctly

2. **SystemSettings** (database)
   - Set `auto_sync_enabled = True`
   - Configured `sync_interval_hours = 24`

## Next Steps

1. Monitor Django console for sync activity
2. Check that inspections are being updated
3. Verify client names are syncing from Google Sheets
4. Test manual sync functionality

## Manual Sync Commands

To trigger syncs manually via Python:

```python
# Full sync (Google Sheets + SQL Server)
from main.services.scheduled_sync_service import scheduled_sync_service
success, message = scheduled_sync_service.run_manual_sync('all')
print(message)

# Just Google Sheets
success, message = scheduled_sync_service.run_manual_sync('google_sheets')

# Just SQL Server
success, message = scheduled_sync_service.run_manual_sync('sql_server')
```

## Service Status Check

Check if service is running:

```python
from main.services.scheduled_sync_service import get_scheduled_sync_service_status
status = get_scheduled_sync_service_status()
print(f"Running: {status['is_running']}")
print(f"Last Sync: {status['last_sync_times']}")
print(f"Next Sync: {status['next_sync_times']}")
```

---

**Date**: 2025-11-18
**Status**: Auto sync ENABLED and configured to run every 24 hours
**Service**: Should auto-start on next Django restart or page load
