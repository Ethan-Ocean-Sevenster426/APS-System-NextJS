# Google Sheets Client Name Sync - Implementation Guide

## ✅ **GOOGLE SHEETS IS NOW THE MASTER SOURCE FOR CLIENT NAMES!**

When you update a client name in Google Sheets and resync, all inspections will automatically show the updated name!

---

## 🎯 HOW IT WORKS

### Data Flow:

```
SQL Server Inspection
  ↓ (provides)
InternalAccountNumber: "RE-IND-RAW-NA-0222"
Client Name (SQL): "New Processed Meat Retailer"
  ↓ (sync matches with)
Google Sheets (Column H)
InternalAccountNumber: "RE-IND-RAW-NA-0222"
  ↓ (uses name from)
Google Sheets (Column J)
Client Name (Google): "Updated Client Name Here!"
  ↓ (displays)
Inspection Shows: "Updated Client Name Here!"
```

### Step-by-Step Process:

1. **SQL Server provides:**
   - `InternalAccountNumber` (e.g., `RE-IND-RAW-NA-0222`)
   - Client name from SQL Server (fallback)

2. **Sync process matches:**
   - Looks up `InternalAccountNumber` in Django `Client` table (synced from Google Sheets)

3. **Google Sheets wins:**
   - If account code matches, uses Google Sheets client name
   - If no match, falls back to SQL Server name

4. **Inspection displays:**
   - Shows the Google Sheets name (if matched)
   - Account code displayed for reference

---

## 📁 FILES MODIFIED

### 1. **[main/models.py](main/models.py#L381-L382)** - Added Field to Model

```python
# Reference information
remote_id = models.IntegerField(blank=True, null=True, help_text="Original ID from remote system")
client_name = models.CharField(max_length=200, blank=True, null=True,
                              help_text="Client name (updated from Google Sheets if match found)")
internal_account_code = models.CharField(max_length=100, blank=True, null=True, db_index=True,
                                        help_text="Internal Account Code from SQL Server (used to match with Google Sheets)")
```

**Index Added** ([models.py:433](main/models.py#L433)):
```python
models.Index(fields=['internal_account_code']),
```

### 2. **[main/views/data_views.py](main/views/data_views.py#L80-L92)** - Updated SQL Query

Added `clt.InternalAccountNumber` to all UNION queries:

```sql
SELECT 'POULTRY' as Commodity,
       DateOfInspection,
       ...,
       clt.Name as Client,
       clt.InternalAccountNumber as InternalAccountNumber,  -- ← NEW!
       ProductName
FROM ...
```

All 6 queries updated (POULTRY x3, EGGS, RAW, PMP).

### 3. **[main/services/scheduled_sync_service.py](main/services/scheduled_sync_service.py#L202-L257)** - Updated Sync Logic

**New Logic** ([scheduled_sync_service.py:205-235](main/services/scheduled_sync_service.py#L205-L235)):

```python
# Extract data from SQL Server
client_name_sql = sql_insp.get('Client')  # SQL Server name (fallback)
internal_account_code = sql_insp.get('InternalAccountNumber')  # Account code

# Default to SQL Server name
client_name = client_name_sql

if internal_account_code:
    # Try to find client in Google Sheets (Django Client table) by account code
    try:
        google_client = Client.objects.filter(
            internal_account_code=internal_account_code
        ).first()

        if google_client and google_client.name:
            # Use Google Sheets name (master source)
            client_name = google_client.name
    except Exception:
        # Error looking up Google Sheets, fall back to SQL Server name
        client_name = client_name_sql

# Save inspection with Google Sheets name (if matched)
inspection, created = FoodSafetyAgencyInspection.objects.update_or_create(
    remote_id=inspection_id,
    defaults={
        'client_name': client_name,  # ← Google Sheets name if matched!
        'internal_account_code': internal_account_code,  # ← Store for future
        ...
    }
)
```

### 4. **Database Migration**

**Created**: `main/migrations/0011_add_internal_account_code_to_inspections.py`

**Applied**: Successfully migrated ✅

```bash
python manage.py makemigrations main --name add_internal_account_code_to_inspections
python manage.py migrate
```

---

## 🔄 HOW TO UPDATE CLIENT NAMES

### Step 1: Update Google Sheets

1. Open Google Sheets: "Internal Account Code Generator"
2. Find the client in **Column J** (Client Name)
3. Update the name (e.g., "Old Name" → "New Improved Name")
4. **Column H** (Account Code) must match (e.g., `RE-IND-RAW-NA-0222`)

### Step 2: Sync Google Sheets

Run Google Sheets sync to update Django Client table:

```python
# Option A: Automatic sync (runs every X minutes if enabled)
# Settings → System Settings → Enable Auto-Sync → Google Sheets Enabled

# Option B: Manual sync via button
# Click "Sync Google Sheets" button in admin

# Option C: Manual sync via Django shell
python manage.py shell
>>> from main.services.google_sheets_service import GoogleSheetsService
>>> service = GoogleSheetsService()
>>> service.refresh_clients_table()
```

### Step 3: Sync SQL Server Inspections

Run SQL Server sync to update inspections with new names:

```python
# Option A: Automatic sync (runs every X minutes if enabled)
# Settings → System Settings → Enable Auto-Sync → SQL Server Enabled

# Option B: Manual sync via button
# Click "Sync SQL Server" button in admin

# Option C: Manual sync via scheduled service
python manage.py shell
>>> from main.services.scheduled_sync_service import ScheduledSyncService
>>> service = ScheduledSyncService()
>>> service.sync_sql_server()
```

### Step 4: Verify Changes

1. Go to Inspections page
2. Find inspections with the updated client
3. Client Name column should show the **NEW** name from Google Sheets!
4. Account Code column shows the matching code (e.g., `RE-IND-RAW-NA-0222`)

---

## 📊 EXAMPLE SCENARIO

### Before Implementation:

**SQL Server**: "New Processed Meat Retailer"
**Google Sheets**: (not used)
**Inspection Shows**: "New Processed Meat Retailer"

**Problem**: If you rename the client in Google Sheets, inspections still show old name.

---

### After Implementation:

**SQL Server**:
- Client Name: "New Processed Meat Retailer"
- Account Code: `RE-IND-RAW-NA-0222`

**Google Sheets** (Column H & J):
- Column H: `RE-IND-RAW-NA-0222`
- Column J: "Premium Meat Processor Ltd"  ← **Updated name!**

**Inspection Shows** (after resync):
- Client Name: "Premium Meat Processor Ltd"  ← **Google Sheets name!**
- Account Code: `RE-IND-RAW-NA-0222`

**Result**: ✅ All inspections automatically show the new name!

---

## 🔍 MATCHING LOGIC

### Case 1: Perfect Match ✅
```
SQL Server Account Code: RE-IND-RAW-NA-0222
Google Sheets Column H:  RE-IND-RAW-NA-0222
Result: Uses Google Sheets Column J name
```

### Case 2: No Match ⚠️
```
SQL Server Account Code: AB-NEW-CODE-9999
Google Sheets Column H:  (no match found)
Result: Falls back to SQL Server client name
```

### Case 3: Missing Account Code ⚠️
```
SQL Server Account Code: NULL or empty
Result: Uses SQL Server client name (no lookup attempted)
```

---

## ✅ BENEFITS

1. **Single Source of Truth**: Google Sheets is the master for client names
2. **Easy Updates**: Just edit Google Sheets and resync
3. **No Manual Edits**: No need to update inspections individually
4. **Bulk Renaming**: One Google Sheets change updates ALL related inspections
5. **Audit Trail**: Account code tracks the relationship
6. **Fallback Safety**: If no match, uses SQL Server name (no data loss)

---

## 🧪 TESTING

### Test 1: Verify Account Code Syncing

```bash
cd "c:\Users\Ethan\Desktop\Inspection-System-master\Inspection-System-master"
python test_account_codes_v2.py
```

**Expected Output**:
- Shows latest 10 inspections with account codes
- Displays `InternalAccountNumber` field from SQL Server
- Sample values: `RE-IND-RAW-NA-0222`, `AB-IND-RAW-NA-1626`, etc.

### Test 2: Verify Client Name Matching

```python
python manage.py shell

# Check if inspection has account code
>>> from main.models import FoodSafetyAgencyInspection, Client
>>> insp = FoodSafetyAgencyInspection.objects.first()
>>> print(f"Client Name: {insp.client_name}")
>>> print(f"Account Code: {insp.internal_account_code}")

# Check if Google Sheets has matching client
>>> if insp.internal_account_code:
...     client = Client.objects.filter(internal_account_code=insp.internal_account_code).first()
...     if client:
...         print(f"Google Sheets Name: {client.name}")
...         print(f"Match: {client.name == insp.client_name}")
```

### Test 3: End-to-End Name Update

1. Find an inspection:
   - Note current client name
   - Note account code (e.g., `RE-IND-RAW-NA-0222`)

2. Update Google Sheets:
   - Find row with matching account code in Column H
   - Change name in Column J to "TEST CLIENT NAME UPDATED"

3. Sync Google Sheets:
   ```python
   python manage.py shell
   >>> from main.services.google_sheets_service import GoogleSheetsService
   >>> service = GoogleSheetsService()
   >>> service.refresh_clients_table()
   ```

4. Sync SQL Server:
   ```python
   >>> from main.services.scheduled_sync_service import ScheduledSyncService
   >>> sync = ScheduledSyncService()
   >>> sync.sync_sql_server()
   ```

5. Verify Update:
   ```python
   >>> from main.models import FoodSafetyAgencyInspection
   >>> insp = FoodSafetyAgencyInspection.objects.filter(
   ...     internal_account_code='RE-IND-RAW-NA-0222'
   ... ).first()
   >>> print(insp.client_name)  # Should show "TEST CLIENT NAME UPDATED"
   ```

---

## 🚨 IMPORTANT NOTES

### 1. Google Sheets Format Requirements

**Column H**: Internal Account Code (MUST MATCH SQL Server)
```
RE-IND-RAW-NA-0222
AB-IND-RAW-NA-1626
PR-IND-RAW-NA-0573
```

**Column J**: Client Name (YOUR MASTER NAME)
```
Premium Meat Processor Ltd
Bushvalley Chickens
RCL Foods P2
```

**Column K**: Email (optional)

### 2. Sync Order Matters

**Correct Order**:
1. Sync Google Sheets FIRST (updates Client table)
2. Sync SQL Server SECOND (matches and updates inspection names)

**Wrong Order**:
1. ❌ Sync SQL Server first → Uses old Google Sheets data
2. Sync Google Sheets second → Inspections still have old names

**Solution**: Always sync Google Sheets before SQL Server, or use "Sync All" button.

### 3. Account Code Must Match Exactly

- SQL Server: `RE-IND-RAW-NA-0222`
- Google Sheets: `RE-IND-RAW-NA-0222`  ← Must be EXACT match
- Case sensitive: `RE-ind-raw-na-0222` ❌ Will NOT match

### 4. Fallback Behavior

If account code doesn't match, system falls back to SQL Server name:
- No error occurs
- Inspection still saves
- Uses SQL Server client name instead

---

## 📝 TROUBLESHOOTING

### Problem: Inspection not showing Google Sheets name

**Check 1**: Does inspection have account code?
```python
>>> insp = FoodSafetyAgencyInspection.objects.get(id=123)
>>> print(insp.internal_account_code)  # Should NOT be None/empty
```

**Check 2**: Does Google Sheets have matching entry?
```python
>>> from main.models import Client
>>> Client.objects.filter(internal_account_code='RE-IND-RAW-NA-0222').exists()  # Should be True
```

**Check 3**: Are account codes matching exactly?
```python
>>> insp_code = insp.internal_account_code.strip()
>>> google_code = Client.objects.first().internal_account_code.strip()
>>> print(f"{insp_code} == {google_code}: {insp_code == google_code}")
```

**Check 4**: Did you sync in correct order?
1. Sync Google Sheets
2. Sync SQL Server
3. Refresh page

---

## 🎓 SUMMARY

**Before**: SQL Server provided client names, Google Sheets not used

**After**: Google Sheets is the master source for client names
- SQL Server provides account codes
- Google Sheets provides client names (via account code lookup)
- Update Google Sheets → Resync → All inspections updated!

**Files Changed**:
- ✅ `main/models.py` - Added `internal_account_code` field
- ✅ `main/views/data_views.py` - Updated SQL query to include account code
- ✅ `main/services/scheduled_sync_service.py` - Added Google Sheets lookup logic
- ✅ Database migration applied

**Next Steps**:
1. Sync Google Sheets to populate Client table
2. Sync SQL Server to match inspections with Google Sheets names
3. Update client names in Google Sheets anytime
4. Resync to see changes instantly!

---

**Generated**: 2025-11-06
**Status**: ✅ FULLY IMPLEMENTED
**Database**: ✅ Migration Applied
**Ready to Use**: ✅ YES
