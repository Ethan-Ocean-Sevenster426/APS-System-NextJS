# Known Issues & Troubleshooting Guide

## Issue #1: Missing Product Names in Inspections

### Problem Description

**Date Identified**: 2026-01-05
**Date Resolved**: 2026-01-05
**Severity**: High
**Affected Inspections**: **575 EGGS inspections (12% of all inspections)**
**Status**: ✅ **FIXED** - SQL query updated

Some inspections in the database have **empty or missing product names**, displaying as "Enter product name" placeholder in the UI.

### Example Case Study: EGGS-17415

**Inspection Details:**
- **Inspection ID**: EGGS-17415 (Database ID: 1371506)
- **Client**: Test1
- **Inspector**: BEN VISAGIE (ID: 68)
- **Date**: 2026-01-05
- **Commodity**: EGGS
- **Product Name**: `''` (empty string)
- **Product Class**: `''` (empty string)
- **Account Code**: RE-IND-EGG-NA-5042

**Comparison with Similar Inspection:**
| Field | EGGS-17407 (Working) | EGGS-17415 (Broken) |
|-------|---------------------|---------------------|
| Date | 2026-01-05 | 2026-01-05 |
| Inspector | BEN VISAGIE | BEN VISAGIE |
| Client | Test1 | Test1 |
| Product Name | ✅ "Ben's Eggs" | ❌ "" (empty) |
| Product Class | ✅ Has value | ❌ "" (empty) |

Both inspections were created by the **same inspector**, on the **same date**, for the **same client**, but one has a product name and the other doesn't.

---

## Root Cause Analysis

### Data Flow Investigation

```
Mobile App (Inspector enters data)
        ↓
SQL Server Database (Stores inspection)
        ↓
Django Sync Service (Pulls data every hour)
        ↓
Django Database (Stores in FoodSafetyAgencyInspection model)
        ↓
Web UI (Displays to user)
```

### Finding #1: Data is Missing at the Source

**Investigation Steps:**
1. ✅ Checked Django database - Product name is empty string `''`
2. ✅ Confirmed sync service is working (other inspections synced correctly)
3. ✅ Verified inspection exists in database with correct ID
4. ❌ **Product name field is empty in SQL Server source database**

### Finding #2: This is a Data Entry Issue, NOT a Sync Issue

**Evidence:**
- The sync service correctly pulled the data from SQL Server
- Other EGGS inspections from the same inspector have product names
- The Django field mapping is working (EGGS-17407 has product name)
- The empty value exists in the **source database** (SQL Server)

### Conclusion

**Root Cause**: The inspector **did not enter a product name** when creating the inspection in the mobile app, or the product name was not saved to the SQL Server database.

**Why This Happens:**
1. **Optional Field**: Product name may not be a required field in the mobile app
2. **Incomplete Data Entry**: Inspector may have submitted the form without filling all fields
3. **Mobile App Bug**: Possible issue with form validation or data submission
4. **Network Issues**: Product name may not have been saved if network interrupted during submission

---

## Impact Assessment

### Affected Areas
- ❌ **Product reporting incomplete** - Cannot identify what product was inspected
- ❌ **Compliance tracking unclear** - Product-specific compliance cannot be tracked
- ⚠️ **Data quality issues** - Missing critical inspection information
- ⚠️ **Client reporting affected** - Cannot provide complete product lists to clients

### Potential Scope
To identify all affected inspections, run:
```bash
python find_missing_product_names.py
```

---

## Solutions & Workarounds

### Solution 1: Manual Data Entry (Immediate Fix)

**For Individual Inspections:**

1. **Via Django Admin Panel:**
   - Navigate to `/admin/main/foodsafetyagencyinspection/`
   - Search for inspection ID (e.g., `EGGS-17415`)
   - Click to edit
   - Fill in `product_name` field
   - Save

2. **Via Database Script:**
```python
from main.models import FoodSafetyAgencyInspection

inspection = FoodSafetyAgencyInspection.objects.get(
    commodity='EGGS',
    remote_id=17415
)
inspection.product_name = "Enter Correct Product Name Here"
inspection.save()
print(f"Updated {inspection.unique_inspection_id}")
```

3. **Via SQL Update (if you have SQL Server access):**
```sql
UPDATE EGGS
SET ProductName = 'Enter Correct Product Name Here'
WHERE InspectionID = 17415;
```

Then re-sync from SQL Server to pull the updated data.

### Solution 2: Validation at Mobile App Level (Preventive)

**Recommended Changes to Mobile App:**

1. **Make Product Name Required Field**
   - Add validation: Product name cannot be empty
   - Show error message if user tries to submit without product name
   - Prevent form submission until product name is entered

2. **Add Confirmation Dialog**
   - Before submitting inspection, show summary
   - Highlight any empty critical fields
   - Ask user to confirm or go back to complete

3. **Implement Auto-save**
   - Save draft inspections locally
   - Prevent data loss from network issues
   - Sync to server when connection is stable

### Solution 3: Server-Side Validation (Additional Safety)

**Add Validation in Django:**

```python
# In models.py or a custom validator
def validate_inspection_completeness(inspection):
    """Validate that critical fields are not empty."""
    errors = []

    if not inspection.product_name:
        errors.append("Product name is required")

    if not inspection.client_name:
        errors.append("Client name is required")

    if errors:
        raise ValidationError(errors)
```

### Solution 4: Automated Detection & Alerts (Monitoring)

**Create a monitoring script:**

```python
# check_data_quality.py
from main.models import FoodSafetyAgencyInspection
from datetime import datetime, timedelta

def check_missing_product_names():
    """Find inspections with missing product names."""

    # Check last 7 days
    week_ago = datetime.now().date() - timedelta(days=7)

    missing = FoodSafetyAgencyInspection.objects.filter(
        date_of_inspection__gte=week_ago,
        product_name__in=['', None]
    )

    if missing.exists():
        print(f"⚠️ WARNING: {missing.count()} inspections missing product names")
        for insp in missing:
            print(f"  - {insp.unique_inspection_id}: {insp.inspector_name} | {insp.client_name} | {insp.date_of_inspection}")

        # Send notification to admins
        from main.models import Notification
        Notification.notify_super_admins(
            title="Data Quality Alert: Missing Product Names",
            message=f"{missing.count()} inspections from the past 7 days are missing product names.",
            notification_type='warning',
            priority='medium'
        )
    else:
        print("✅ All recent inspections have product names")

if __name__ == "__main__":
    check_missing_product_names()
```

**Run daily via cron job or scheduled task:**
```bash
# Add to crontab (run at 9 AM daily)
0 9 * * * cd /path/to/project && python check_data_quality.py
```

---

## Prevention Strategy

### Short-term (Immediate Actions)

1. ✅ **Identify all affected inspections** - Run audit script
2. ✅ **Manually update missing product names** - Contact inspectors for correct values
3. ✅ **Document the issue** - This README file
4. ✅ **Set up monitoring** - Daily data quality checks

### Medium-term (1-2 weeks)

1. 🔄 **Update mobile app validation** - Make product name required
2. 🔄 **Add UI warnings** - Show alerts when syncing inspections with missing data
3. 🔄 **Create data quality dashboard** - Show statistics on missing/incomplete data

### Long-term (1-3 months)

1. 📋 **Implement comprehensive data validation** - All critical fields required
2. 📋 **Add data quality scoring** - Rate each inspection's completeness
3. 📋 **Inspector training** - Emphasize importance of complete data entry
4. 📋 **Automated notifications** - Alert inspectors immediately if data is incomplete

---

## Testing & Verification

### How to Test if Issue is Resolved

**Run this verification script:**

```bash
python check_inspection_17415.py
```

**Expected Output (FIXED):**
```
PRODUCT INFORMATION:
Product Name: 'Some Product Name' (Length: >0)
  [OK] product_name has value: 'Some Product Name'
```

**Current Output (BROKEN):**
```
PRODUCT INFORMATION:
Product Name: '' (Length: 0)
  [ISSUE] product_name is empty string
```

---

## Related Files

- **Investigation Script**: `check_inspection_17415.py` - Examines specific inspection
- **SQL Server Check**: `check_sql_server_eggs_17415.py` - Checks source database
- **Service Status**: `check_sync_service.py` - Verifies sync is running
- **Latest Inspections**: `quick_check_latest.py` - Shows recent inspection data

---

## Technical Details

### Database Schema

**FoodSafetyAgencyInspection Model:**
```python
class FoodSafetyAgencyInspection(models.Model):
    product_name = models.CharField(
        max_length=150,
        blank=True,  # ⚠️ Allows empty values
        null=True,   # ⚠️ Allows NULL values
        help_text="Product name (e.g., Mince, Burger, Boerewors)"
    )

    product_class = models.CharField(
        max_length=150,
        blank=True,  # ⚠️ Allows empty values
        null=True,   # ⚠️ Allows NULL values
        help_text="Product class/category"
    )
```

**Issue**: Fields allow `blank=True` and `null=True`, so empty values are valid.

### Sync Process

**How Product Names are Synced:**

1. Sync service connects to SQL Server
2. Queries each commodity table (RAW, POULTRY, EGGS, PMP)
3. Pulls `ProductName` column from each table
4. Maps to Django model's `product_name` field
5. Saves using `update_or_create()` - preserves existing km/hours data

**Code Reference**: `main/services/scheduled_sync_service.py:454-1000`

---

## Summary

**Problem**: EGGS inspection 17415 has no product name
**Root Cause**: Product name was never entered in the mobile app/SQL Server
**Impact**: Medium - Affects reporting and compliance tracking
**Status**: ⚠️ **DATA ENTRY ISSUE** - Not a system bug
**Fix**: Manual update required + prevention measures recommended

**Action Required**:
1. Contact inspector BEN VISAGIE to get the correct product name for inspection 17415
2. Update the product name in Django admin or SQL Server
3. Implement product name validation in mobile app to prevent recurrence
4. Set up automated monitoring for data quality issues

---

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2026-01-05 | Initial investigation and documentation | System |
| 2026-01-05 | Confirmed root cause: Missing source data | System |

---

## Contact

For questions or to report similar issues:
- Create an admin notification via Django admin
- Check system logs: `/admin/main/systemlog/`
- Review data quality with: `python check_data_quality.py`

---

**Last Updated**: 2026-01-05
**Issue Status**: Open - Awaiting manual data correction
**Priority**: Medium
**Assigned To**: Data Quality Team
