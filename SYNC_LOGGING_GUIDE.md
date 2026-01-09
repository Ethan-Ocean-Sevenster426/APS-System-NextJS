# SQL Server Sync - Comprehensive Logging Guide

## ✅ **TERMINAL LOGGING NOW SHOWS EXACTLY WHAT'S HAPPENING!**

When you sync inspections from SQL Server, the terminal now displays detailed logs showing how account codes are being grabbed and matched with Google Sheets.

---

## 🎯 WHAT YOU'LL SEE

### 1. **Connection Phase**
```
================================================================================
🗄️  STARTING SQL SERVER SYNC
================================================================================

📡 Connecting to SQL Server...
   Server: 102.67.140.12:1053
   Database: AFS
✅ Connected successfully!
```

### 2. **Data Retrieval Phase**
```
📅 Fetching inspections and account codes from SQL Server...
   Query: FSA_INSPECTION_QUERY (includes InternalAccountNumber)

📊 Retrieved 2203 inspections from SQL Server
   Each inspection includes: Client Name, Account Code, Date, Inspector, Commodity, Products
```

### 3. **Processing Phase (Detailed Logs)**

For the **first 5 inspections** and **every 10th inspection**, you'll see detailed matching info:

#### Example 1: Google Sheets Match Found (Different Name)
```
   [1/2203] Inspection #12345
      📋 Account Code: RE-IND-RAW-NA-0222
      🗄️  SQL Server Name: New Processed Meat Retailer
      ✅ Google Sheets Match: FOUND
      📊 Google Sheets Name: Premium Meat Processor Ltd
      ⭐ USING: Premium Meat Processor Ltd (Google Sheets)
```

#### Example 2: Google Sheets Match Found (Same Name)
```
   [10/2203] Inspection #12346
      📋 Account Code: AB-IND-RAW-NA-1626
      ✅ Google Sheets Match: FOUND (same name)
      ⭐ USING: Bushvalley Chickens
```

#### Example 3: No Google Sheets Match (Fallback to SQL Server)
```
   [20/2203] Inspection #12347
      📋 Account Code: XX-NEW-CODE-9999
      ❌ Google Sheets Match: NOT FOUND
      🗄️  Fallback to SQL Server Name: Some New Client
```

#### Example 4: No Account Code
```
   [30/2203] Inspection #12348
      📋 Account Code: NONE
      🗄️  Using SQL Server Name: Old Client Without Code
```

### 4. **Progress Updates (Every 50 Inspections)**
```
   📈 Progress: 50/2203 inspections processed...
      - Account codes found: 48
      - Google Sheets matches: 45
      - Using Google Sheets names: 12
      - Using SQL Server names: 38
```

### 5. **Final Summary**
```
================================================================================
✅ SQL SERVER SYNC COMPLETED
================================================================================

📊 Sync Statistics:
   - Total inspections processed: 2203
   - New inspections created: 0
   - Existing inspections updated: 2203
   - Product names synced: 1845

📋 Account Code Statistics:
   - Inspections with account codes: 2203 (100.0%)
   - Google Sheets matches found: 2150 (97.6% of those with codes)
   - Using Google Sheets names: 156
   - Using SQL Server names (fallback): 2047

💾 Database Status:
   - Total inspections in database: 2203

⭐ Google Sheets is the master source for client names!
   Update client names in Google Sheets and resync to see changes.
================================================================================
```

---

## 🔍 UNDERSTANDING THE STATISTICS

### Account Code Statistics Explained

1. **Inspections with account codes**: How many inspections have `InternalAccountNumber` from SQL Server
   - If this is low, SQL Server might not be providing account codes
   - Should be close to 100% if SQL Server has account codes for all clients

2. **Google Sheets matches found**: How many account codes matched with Google Sheets Client table
   - If this is low, you need to sync Google Sheets first
   - Should be high (90%+) if Google Sheets is up to date

3. **Using Google Sheets names**: How many inspections are using a DIFFERENT name from Google Sheets
   - This is where you renamed a client in Google Sheets
   - Shows how many inspections benefited from Google Sheets master names

4. **Using SQL Server names (fallback)**: How many inspections use SQL Server names
   - Either no account code, or no Google Sheets match, or same name in both

---

## 🚀 HOW TO USE

### Option 1: Via Settings Page (Recommended)
1. Go to Settings page
2. Click "Sync SQL Server Inspections" button
3. Watch the terminal/console for detailed logs

### Option 2: Via Django Shell
```python
python manage.py shell

>>> from main.services.scheduled_sync_service import ScheduledSyncService
>>> service = ScheduledSyncService()
>>> service.sync_sql_server()
```

### Option 3: Via Test Script
```bash
cd "c:\Users\Ethan\Desktop\Inspection-System-master\Inspection-System-master"
python test_sync_with_logging.py
```

---

## 📊 EXAMPLE SCENARIOS

### Scenario 1: First Sync (No Account Codes Yet)

**Before running sync**, existing inspections won't have account codes:

```
📋 Account Code Statistics:
   - Inspections with account codes: 0 (0.0%)
   - Google Sheets matches found: 0 (0.0% of those with codes)
   - Using Google Sheets names: 0
   - Using SQL Server names (fallback): 2203
```

**After running sync**, all inspections should have account codes:

```
📋 Account Code Statistics:
   - Inspections with account codes: 2203 (100.0%)
   - Google Sheets matches found: 2150 (97.6% of those with codes)
   - Using Google Sheets names: 0 (same names initially)
   - Using SQL Server names (fallback): 2203
```

### Scenario 2: After Updating Client Name in Google Sheets

**Before updating Google Sheets**:
- Client "RE-IND-RAW-NA-0222" shows as "New Processed Meat Retailer" (SQL Server name)

**Steps**:
1. Update Google Sheets Column J for account code `RE-IND-RAW-NA-0222` to "Premium Meat Processor Ltd"
2. Sync Google Sheets first (to update Django Client table)
3. Sync SQL Server (to match and update inspection names)

**After syncing**:
```
   [1/2203] Inspection #12345
      📋 Account Code: RE-IND-RAW-NA-0222
      🗄️  SQL Server Name: New Processed Meat Retailer
      ✅ Google Sheets Match: FOUND
      📊 Google Sheets Name: Premium Meat Processor Ltd
      ⭐ USING: Premium Meat Processor Ltd (Google Sheets)

📋 Account Code Statistics:
   - Using Google Sheets names: 156 ← Increased by 156 inspections with this account code
```

All inspections with account code `RE-IND-RAW-NA-0222` now show "Premium Meat Processor Ltd"!

---

## 🐛 TROUBLESHOOTING

### Problem: "Inspections with account codes: 0 (0.0%)"

**Cause**: SQL Server query not returning account codes

**Fix**:
1. Check that SQL query includes `clt.InternalAccountNumber as InternalAccountNumber`
2. Verify SQL Server Clients table has `InternalAccountNumber` field
3. Run `python test_account_codes_v2.py` to verify SQL Server has account codes

### Problem: "Google Sheets matches found: 0"

**Cause**: Google Sheets Client table is empty or out of sync

**Fix**:
1. Sync Google Sheets FIRST before SQL Server
2. Check Django shell:
   ```python
   from main.models import Client
   print(Client.objects.count())  # Should be > 0
   print(Client.objects.filter(internal_account_code__isnull=False).count())  # Should be > 0
   ```

### Problem: "Using Google Sheets names: 0" (but matches found)

**This is normal!** It means:
- Account codes are matched with Google Sheets
- But the names in Google Sheets are the SAME as SQL Server
- No renaming has occurred yet

**Not a problem** - the system is working correctly. Names will only show as "Using Google Sheets names" when you actually rename a client in Google Sheets.

---

## ✅ CORRECT SYNC ORDER

Always follow this order:

1. **Sync Google Sheets FIRST**
   - Updates Django Client table with latest account codes and names
   - Run via: Settings → "Sync Google Sheets" button

2. **Sync SQL Server SECOND**
   - Fetches inspections with account codes
   - Matches with Google Sheets Client table
   - Uses Google Sheets names (master source)
   - Run via: Settings → "Sync SQL Server Inspections" button

**Or use "Sync All" button** to run both in correct order automatically.

---

## 📝 WHAT THE LOGS TELL YOU

### ✅ Good Signs

1. **High account code percentage (90%+)**:
   ```
   Inspections with account codes: 2203 (100.0%)
   ```
   → SQL Server is providing account codes for all clients

2. **High Google Sheets match rate (90%+)**:
   ```
   Google Sheets matches found: 2150 (97.6% of those with codes)
   ```
   → Google Sheets Client table is up to date

3. **Detailed logs showing matching**:
   ```
   ✅ Google Sheets Match: FOUND
   ⭐ USING: Premium Meat Processor Ltd (Google Sheets)
   ```
   → Account code matching is working correctly

### ⚠️ Warning Signs

1. **Low account code percentage (<50%)**:
   ```
   Inspections with account codes: 550 (25.0%)
   ```
   → SQL Server might not have account codes for many clients
   → Check SQL Server Clients table

2. **Low Google Sheets match rate (<50%)**:
   ```
   Google Sheets matches found: 110 (20.0% of those with codes)
   ```
   → Google Sheets needs to be synced
   → Or Google Sheets has fewer clients than SQL Server

3. **Many fallbacks**:
   ```
   Using SQL Server names (fallback): 2000
   ```
   → Most inspections falling back to SQL Server names
   → Check Google Sheets sync status

---

## 🎓 SUMMARY

The new logging shows you:

1. **What's being fetched**: Inspections with account codes from SQL Server
2. **How matching works**: Account code → Google Sheets lookup → Name selection
3. **Which names are used**: Google Sheets (master) vs SQL Server (fallback)
4. **Statistics**: How many matched, how many updated, success rate
5. **Progress**: Real-time updates every 50 inspections

**Key Benefit**: You can now SEE exactly what's happening during sync and verify that Google Sheets is being used as the master source for client names!

---

**Generated**: 2025-11-06
**Status**: ✅ READY TO USE
**File Modified**: [main/services/scheduled_sync_service.py](main/services/scheduled_sync_service.py#L166-L380)
**Test Script**: [test_sync_with_logging.py](test_sync_with_logging.py)
