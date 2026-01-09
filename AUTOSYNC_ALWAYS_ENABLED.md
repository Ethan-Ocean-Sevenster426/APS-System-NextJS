# Background Sync - ALWAYS ENABLED

## Overview

The background sync service has been modified to **ALWAYS RUN AUTOMATICALLY** with no option to disable it. This ensures inspection data is never missed.

## What Changed

### 1. **Automatic Startup** ([main/apps.py](main/apps.py))
   - Background sync service now **ALWAYS starts** when Django launches
   - No longer checks if `auto_sync_enabled` is True
   - Service starts automatically every time the server runs
   - Cannot be disabled via settings

### 2. **Forced Sync Execution** ([main/services/scheduled_sync_service.py](main/services/scheduled_sync_service.py))
   - Removed checks for `google_sheets_enabled` and `sql_server_enabled`
   - All syncs run on schedule regardless of settings
   - The "enable/disable" settings in the UI are now **ignored**

### 3. **Model Documentation** ([main/models.py](main/models.py))
   - Updated `SystemSettings` model documentation
   - Clarified that sync is ALWAYS enabled
   - Added help text explaining fields are kept for compatibility only
   - Changed default value of `auto_sync_enabled` to `True`

## What This Means

### ✅ Benefits
- **Never miss inspections** - Data automatically syncs from SQL Server
- **No manual intervention needed** - Service runs in background 24/7
- **Foolproof** - Cannot be accidentally disabled
- **Always up-to-date** - Latest inspection data available within sync interval

### ⚙️ How It Works
1. When you start Django (`python manage.py runserver`), the service auto-starts
2. Every ~1 hour (configurable via `sync_interval_hours`), it syncs:
   - SQL Server inspection data
   - Google Sheets client data
   - Compliance documents
3. If the server restarts, the service automatically restarts too

### 📊 Monitoring
Check service status anytime:
```bash
python check_sync_service.py
```

Check latest inspections:
```bash
python quick_check_latest.py
```

## Settings UI Impact

The settings page may still show enable/disable checkboxes for:
- Auto Sync Enabled
- Google Sheets Integration
- SQL Server Integration

**These checkboxes no longer control whether syncing happens.**
They are kept for UI compatibility but are **completely ignored** by the sync service.

## Troubleshooting

### If inspections aren't syncing:

1. **Check if service is running:**
   ```bash
   python check_sync_service.py
   ```

2. **Restart Django server:**
   ```bash
   python manage.py runserver
   ```
   The service will auto-start on launch.

3. **Check sync interval:**
   Make sure `sync_interval_hours` isn't set to a very large value.
   Recommended: 0.017 hours (~1 minute) or 1.0 hours (1 hour)

### Manual sync trigger:
If you need to force an immediate sync:
```bash
python test_inspection_sync.py
```

## Files Modified

1. **main/apps.py** - Always starts sync service on Django startup
2. **main/services/scheduled_sync_service.py** - Ignores enable/disable settings
3. **main/models.py** - Updated documentation and defaults
4. **ensure_autosync_enabled.py** (new) - Script to verify settings
5. **check_sync_service.py** (new) - Script to check/start service

## Rollback (if needed)

To restore the old behavior where sync can be disabled:

1. Revert changes in `main/apps.py` - add back the `if settings.auto_sync_enabled:` check
2. Revert changes in `main/services/scheduled_sync_service.py` - add back the `settings.get('sql_server_enabled')` checks
3. Update `main/models.py` help text back to original

However, this is **NOT recommended** as it may cause missed inspections.

## Summary

**The background sync service is now bulletproof and will ALWAYS run to ensure inspection data is never missed.**

No action required - just restart your Django server and the service will automatically start and keep running.
