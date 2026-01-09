# Product Sync Changes - Summary

## Problem
The system was grouping multiple products into ONE inspection record with comma-separated product names (e.g., "Product1, Product2, Product3"), but it should create SEPARATE inspection records for each product.

## Root Cause
- **OLD (Working) System**: Used SQL JOIN to product tables, which naturally created multiple rows when an inspection had multiple products
- **NEW (Broken) System**: Fetched inspections WITHOUT JOIN, then separately fetched products and combined them as comma-separated strings

## Solution Applied

### 1. Updated SQL Query (data_views.py)
**File**: `main/views/data_views.py`
**Lines**: 78-92

**Changes**:
- ✅ Removed `SELECT DISTINCT` (we WANT multiple rows per inspection if there are multiple products)
- ✅ Changed `UNION` to `UNION ALL` (faster, preserves all rows)
- ✅ Added `ProductName` to SELECT clause for all queries
- ✅ Added JOINs to product tables where missing (POULTRY tables)
- ✅ Added WHERE filters to exclude NULL/empty product names

**Result**: Each product now gets its own row in the query result

### 2. Updated Sync Logic (google_sheets_service.py)
**File**: `main/services/google_sheets_service.py`
**Lines**: 715-741

**Changes**:
- ✅ Removed `_bulk_fetch_product_names()` call (no longer needed)
- ✅ Now reads `ProductName` directly from query result
- ✅ Simplified code - product name comes from SQL JOIN, not separate fetch

**Result**: Each row from the query creates ONE inspection record with ONE product

## Data Flow

### Before (WRONG):
```
SQL Query → Inspection 5922 (no product)
Separate Fetch → Products: ["Product1", "Product2", "Product3"]
Combine → Inspection 5922: product_name = "Product1, Product2, Product3"
Result: 1 database record with multiple products
```

### After (CORRECT):
```
SQL Query with JOIN →
  Row 1: Inspection 5922, Product1
  Row 2: Inspection 5922, Product2
  Row 3: Inspection 5922, Product3
Result: 3 database records, each with ONE product
```

## Tables Affected

### SQL Server Tables (Source):
1. **PMPInspectedProductRecordTypes** - Field: `PMPItemDetails`
2. **PoultryGradingInspectionRecordTypes** - Field: `ProductName`
3. **PoultryLabelInspectionChecklistRecords** - Field: `ProductName`
4. **PoultryQuidInspectionRecordTypes** - Field: `ProductName`
5. **RawRMPInspectedProductRecordTypes** - Field: `NewProductItemDetails`

### Local Database (Destination):
- **food_safety_agency_inspections** - Field: `product_name`

## Testing

### Test Scripts Created:
1. **demo_product_join.py** - Demonstrates the difference between JOIN vs separate fetch
2. **test_new_product_sync.py** - Tests the new query to verify it works correctly
3. **summary.py** - Shows 50 products from each SQL Server table

### Test Results:
✅ Query returns separate rows for each product
✅ Each row has exactly ONE product name
✅ No comma-separated product lists

## Expected Behavior

### Inspection Groups:
An "inspection group" is multiple inspections at the same client on the same date:

```
Inspection Group: Boxer Superstore, 2025-10-17
├── Individual Inspection 5922 → Product: Mama's Whole Chicken Frozen
├── Individual Inspection 5922 → Product: Oukraal Wors
└── Individual Inspection 5922 → Product: Chorico
```

Each individual inspection has:
- ✅ ONE product name
- ✅ Same inspection ID (grouped together in UI)
- ✅ Same client, date, inspector
- ✅ Separate compliance documents
- ✅ Separate sent status

## Files Modified

1. **main/views/data_views.py**
   - Updated `FSA_INSPECTION_QUERY` to include ProductName in SELECT
   - Removed DISTINCT, changed to UNION ALL
   - Added product table JOINs

2. **main/services/google_sheets_service.py**
   - Removed `_bulk_fetch_product_names()` call
   - Use `ProductName` from query result instead

## Next Steps

To apply these changes:
1. ✅ Changes are already applied to the code
2. Run sync: `python manage.py sync_inspections` or use the web interface
3. Verify in the UI that each product shows as a separate inspection

## Notes

- The old `sql_server_utils.py` file with `fetch_product_names_for_inspection()` is no longer needed for the main sync
- Product names now come directly from the SQL query via JOIN
- This is more efficient (one query instead of multiple) and correct (separate rows per product)
