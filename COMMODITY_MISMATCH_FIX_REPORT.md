# Commodity Mismatch Issue - Investigation & Fix Report
**Date:** 2025-11-30
**Status:** ✅ FIXED

---

## Problem Summary

Inspections from different facilities were appearing incorrectly because the `internal_account_code` field was not being populated during sync from SQL Server. This caused inspections to match clients by name only, leading to commodity type mismatches.

### Example: Festive Facility

**The Issue:**
- Facility registered as: `AB-IND-RAW-NA-3420` (RAW meat facility)
- But inspections show: POULTRY commodity with chicken products
- Products: Fresh chicken, Frozen chicken livers, Braai pack, Mixed portions

**Root Cause in SQL Server:**
```
Client Table:
  - Client ID: 3420
  - Name: Festive
  - Account Code: AB-IND-RAW-NA-3420 (says RAW)

POULTRY Inspections Table:
  - Client ID: 3420 (links to Festive)
  - Products: All chicken/poultry items
  - Commodity: POULTRY
```

The data in SQL Server itself has a mismatch - Festive is registered with a RAW account code but has POULTRY inspections.

---

## Technical Root Cause

### Before Fix:

1. **SQL Query** ([data_views.py:83-93](data_views.py#L83-L93))
   - ✅ Was pulling `InternalAccountNumber` from SQL Server
   - ✅ Query was correct

2. **Django Sync** ([google_sheets_service.py:846-861](google_sheets_service.py#L846-L861))
   - ❌ **NOT populating `internal_account_code` field**
   - Only setting: `client_name`, `product_name`, `commodity`, etc.
   - Missing: `internal_account_code=row_dict.get('InternalAccountNumber')`

3. **Result:**
   - Inspections had `internal_account_code = NULL`
   - Matching logic could only use client name
   - Multiple facilities with same name → wrong matches

---

## The Fix

### Changed Files:

#### 1. [google_sheets_service.py](google_sheets_service.py) (Lines 725-862)

**Import Fix (Lines 729-731):**
```python
# BEFORE: pymssql imported inside try block
try:
    import pymssql

# AFTER: Import at function level
import pymssql
from django.conf import settings
from ..views.data_views import FSA_INSPECTION_QUERY, INSPECTOR_NAME_MAP

try:
```

**Reason:** Prevented `except pymssql.Error` clause from failing due to undefined variable.

**Field Population Fix (Line 861):**
```python
inspection_obj = FoodSafetyAgencyInspection(
    commodity=row_dict.get('Commodity'),
    date_of_inspection=inspection_date,
    # ... other fields ...
    client_name=client_name,
    product_name=product_name_str,
    internal_account_code=row_dict.get('InternalAccountNumber')  # ← ADDED THIS
)
```

**Result:** Now populates `internal_account_code` from SQL Server during sync.

---

## Verification Test Results

### Test: Festive Inspections After Fix

```
BEFORE FIX:
- WITH internal_account_code: 0
- WITHOUT internal_account_code: 10

AFTER FIX:
- WITH internal_account_code: 10  ✅
- WITHOUT internal_account_code: 0  ✅
```

### Sample Data After Fix:

| Date | Commodity | Account Code | Product |
|------|-----------|--------------|---------|
| 2025-11-17 | POULTRY | AB-IND-RAW-NA-3420 | Fresh chicken- with giblets |
| 2025-11-17 | POULTRY | AB-IND-RAW-NA-3420 | Frozen chicken livers |
| 2025-11-17 | POULTRY | AB-IND-RAW-NA-3420 | Frozen chicken braai pack |
| 2025-11-17 | POULTRY | AB-IND-RAW-NA-3420 | mixed Portions |

### Summary:
```
POULTRY    | AB-IND-RAW-NA-3420             |   10 inspections
```

---

## Impact Assessment

### What This Fixes:

1. ✅ **Accurate Facility Matching:** Inspections now match facilities using both name AND account code
2. ✅ **Data Integrity:** All inspections have proper account code from SQL Server
3. ✅ **Mismatch Detection:** Can now identify when SQL Server data has commodity type mismatches
4. ✅ **Better Reporting:** Reports can group/filter by actual account codes

### What Still Needs Attention:

⚠️ **SQL Server Data Quality Issues:**
- Festive is registered as RAW (`AB-IND-RAW-NA-3420`) but has POULTRY inspections
- This is a data quality issue in the source system (SQL Server)
- **Action Required:** Review and correct account codes in SQL Server for affected facilities

---

## Deployment Checklist

- [x] Fix implemented locally
- [x] Fix tested and verified
- [ ] Commit changes to Git
- [ ] Push to GitHub
- [ ] Deploy to server
- [ ] Run sync on server: `python manage.py sync_inspections`
- [ ] Verify inspections have account codes populated
- [ ] Review commodity mismatch report for data quality issues

---

## Files Modified

1. [main/services/google_sheets_service.py](main/services/google_sheets_service.py)
   - Line 729-731: Moved imports outside try block
   - Line 861: Added `internal_account_code` field population

---

## Next Steps

1. **Deploy this fix** to populate `internal_account_code` correctly
2. **Run mismatch detection** to identify all facilities with commodity type mismatches
3. **Review with data owner** - determine if account codes or inspection assignments are incorrect
4. **Update SQL Server** - correct account codes or reassign inspections as needed

---

## Technical Notes

### Account Code Format:
```
AB-IND-RAW-NA-3420
│  │   │   │  │
│  │   │   │  └─ ID number
│  │   │   └──── Region (NA = National)
│  │   └──────── Commodity (RAW/PMP/POULTRY/PTY/EGGS)
│  └──────────── Industry (IND = Independent)
└─────────────── Facility Type (AB = Abattoir)
```

### Commodity Types:
- **RAW**: Raw meat products
- **PMP**: Processed Meat Products
- **POULTRY**: Poultry products (chicken, etc.)
- **EGGS**: Egg products

### Mismatch Indicators:
- Account code contains "RAW" but commodity is "POULTRY" ← Festive case
- Account code contains "POULTRY" but commodity is "RAW"
- Account code contains "PMP" but commodity is "RAW" or "POULTRY"

---

**Report Generated:** 2025-11-30
**Fixed By:** Claude Code
**Status:** Ready for deployment
