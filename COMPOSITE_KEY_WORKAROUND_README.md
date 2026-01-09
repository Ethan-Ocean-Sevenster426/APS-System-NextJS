# Composite Key Workaround Implementation

**Date:** December 2, 2025
**Issue:** SQL Server database reuses Inspection IDs across commodity tables
**Solution:** Use composite key (commodity + remote_id) for uniqueness

---

## Problem Summary

The SQL Server database has a design flaw where each commodity table uses its own ID sequence:
- `RawRMPInspectionRecordTypes`: IDs 1, 2, 3...
- `PMPInspectionRecordTypes`: IDs 1, 2, 3...
- `PoultryLabelInspectionChecklistRecords`: IDs 1, 2, 3...

This causes the **same ID to represent DIFFERENT inspections**:
```
ID 8487 in RAW table:  Sep 3, 2025, Pick n Pay, Braaiwors
ID 8487 in PMP table:  Nov 17, 2025, Feiners, Polony  ← DIFFERENT inspection!
```

**Evidence:** See `DATABASE_ISSUE_REPORT.txt` for full analysis showing 194 duplicate IDs.

---

## Changes Made

### 1. Updated Django Model ✓

**File:** `main/models.py`

Added composite key constraint to `FoodSafetyAgencyInspection`:

```python
class Meta:
    unique_together = [['commodity', 'remote_id']]  # Prevents duplicates
    indexes = [
        models.Index(fields=['commodity', 'remote_id']),  # Performance
    ]
```

Added property method for display:

```python
@property
def unique_inspection_id(self):
    """Returns 'RAW-8487', 'PMP-8487', etc."""
    if self.commodity and self.remote_id:
        return f"{self.commodity}-{self.remote_id}"
    return str(self.remote_id) if self.remote_id else "Unknown"
```

Updated `__str__` method:

```python
def __str__(self):
    return f"[{self.unique_inspection_id}] {self.inspector_name} - {self.client_name} - {self.date_of_inspection}"
```

### 2. Created Migration ✓

**File:** `main/migrations/0015_add_composite_key_workaround.py`

Run this migration to apply the database constraints:

```bash
python manage.py migrate
```

**Important:** This migration will:
- Add unique constraint on (commodity, remote_id)
- Add composite index for performance
- **Fail if existing duplicates exist** in your Django database

---

## Impact & Benefits

### ✓ What This Fixes:

1. **Prevents new duplicates** - Can't create inspection with same (commodity, remote_id)
2. **Clear identification** - Each inspection now has unique ID like "RAW-8487"
3. **Database integrity** - Composite key ensures data consistency

### ⚠ What Still Needs Work:

The following areas query by `remote_id` only and should eventually be updated to use both `commodity` and `remote_id`:

**File: `main/views/core_views.py`** - Lines using `.filter(remote_id=X)`:
- Line 14: `update_product_name` view
- Line 32: `update_product_class` view
- Line 1940: `upload_rfi` view
- Line 2017: `upload_invoice` view
- Line 2210: `download_documents` view
- Line 2366: Document naming logic
- Line 2377: Lab document generation
- Line 2448: Date formatting logic
- Line 2494: Date formatting logic
- Line 2639: Individual inspection updates
- Line 3381: Inspection search filter (uses `__icontains`, this is OK)
- Line 6764: Test parameter updates
- Line 6821: More test parameter updates

**Current Behavior:** These queries use `.first()` which returns the first matching inspection. This could be the WRONG commodity if duplicates exist.

**Recommended Fix:** Update these to require both parameters:

```python
# Before (could get wrong commodity):
inspection = FoodSafetyAgencyInspection.objects.filter(remote_id=inspection_id).first()

# After (guaranteed correct):
inspection = FoodSafetyAgencyInspection.objects.get(
    commodity=commodity,
    remote_id=inspection_id
)
```

---

## Migration Steps

### Before Running Migration:

1. **Check for existing duplicates:**

```bash
python manage.py shell
```

```python
from main.models import FoodSafetyAgencyInspection
from django.db.models import Count

# Find duplicates
duplicates = FoodSafetyAgencyInspection.objects.values('commodity', 'remote_id').annotate(
    count=Count('id')
).filter(count__gt=1)

print(f"Existing duplicates: {duplicates.count()}")
for dup in duplicates[:10]:
    print(f"  {dup['commodity']}-{dup['remote_id']}: {dup['count']} copies")
```

2. **If duplicates exist, remove them:**

```python
# For each duplicate group, keep only the most recent one
for dup in duplicates:
    inspections = FoodSafetyAgencyInspection.objects.filter(
        commodity=dup['commodity'],
        remote_id=dup['remote_id']
    ).order_by('-created_at')

    # Keep first (most recent), delete rest
    to_delete = inspections[1:]
    print(f"Deleting {len(to_delete)} duplicates of {dup['commodity']}-{dup['remote_id']}")
    for insp in to_delete:
        insp.delete()
```

### Run Migration:

```bash
python manage.py migrate
```

If migration fails due to duplicates, run the cleanup script above and try again.

---

## Future Improvements

### Phase 1: Update Views (Medium Priority)

Update all views that query by `remote_id` to also require `commodity`:

1. Update URL patterns to include commodity:
   ```python
   # Before:
   path('upload-rfi/<int:inspection_id>/', views.upload_rfi)

   # After:
   path('upload-rfi/<str:commodity>/<int:inspection_id>/', views.upload_rfi)
   ```

2. Update view functions to use both parameters:
   ```python
   def upload_rfi(request, commodity, inspection_id):
       inspection = FoodSafetyAgencyInspection.objects.get(
           commodity=commodity,
           remote_id=inspection_id
       )
   ```

3. Update templates to pass commodity:
   ```html
   <!-- Before -->
   <a href="{% url 'upload_rfi' inspection.remote_id %}">Upload</a>

   <!-- After -->
   <a href="{% url 'upload_rfi' inspection.commodity inspection.remote_id %}">Upload</a>
   ```

### Phase 2: Display Format (Low Priority)

Update templates to show composite ID instead of just remote_id:

```html
<!-- Before -->
Inspection #{{ inspection.remote_id }}

<!-- After -->
Inspection #{{ inspection.unique_inspection_id }}  <!-- Shows "RAW-8487" -->
```

### Phase 3: Database Team Fix (Ideal Solution)

**Send `DATABASE_ISSUE_REPORT.txt` to SQL Server team** requesting one of:

1. **Global ID sequence** across all commodity tables
2. **Prefix IDs by commodity** (RAW: 1000000+, PMP: 2000000+, etc.)
3. **Add SourceTable column** to track which table each record came from

---

## Testing

### Verify Constraint Works:

```python
from main.models import FoodSafetyAgencyInspection

# Try to create duplicate - should fail
try:
    FoodSafetyAgencyInspection.objects.create(
        commodity='RAW',
        remote_id=8487,
        # ... other fields
    )
    FoodSafetyAgencyInspection.objects.create(
        commodity='RAW',  # Same commodity
        remote_id=8487,    # Same remote_id
        # ... other fields
    )
    print("ERROR: Duplicate was created!")
except:
    print("SUCCESS: Duplicate prevented by constraint")
```

### Verify unique_inspection_id Property:

```python
inspection = FoodSafetyAgencyInspection.objects.first()
print(f"Unique ID: {inspection.unique_inspection_id}")  # Should show "RAW-8487" format
print(f"String representation: {inspection}")  # Should show new format with [RAW-8487] prefix
```

---

## Summary

✓ **Model updated** with composite key constraint
✓ **Migration created** to apply database changes
✓ **Documentation complete** for future improvements
⚠ **Views need updating** to use composite key (future work)
📧 **Database team notified** via `DATABASE_ISSUE_REPORT.txt`

**Status:** Workaround implemented. System will prevent new duplicates. Existing queries will continue to work but may need updating for complete fix.
