# Fee Versioning System - User Guide

## Overview
The Food Safety Agency Inspection System now includes a time-based fee versioning system that tracks all historical fee changes. This ensures that past inspections are always calculated using the fees that were active on their inspection date.

## Key Features

### 1. Historical Fee Tracking
- Every time a fee is changed, a new history record is created instead of overwriting the old rate
- Each fee history entry includes:
  - The rate amount
  - Effective date (when the rate becomes active)
  - Who made the change
  - When the change was made
  - Optional notes about why the fee was changed

### 2. Time-based Fee Lookups
- The system can determine what fee was active on any given date
- Past inspections automatically use historical rates
- Future fee changes can be pre-scheduled by setting an effective date in the future

### 3. Complete Audit Trail
- Full history of all fee changes
- Track who changed what and when
- Add notes to document the reason for each change

## How to Update Fees (UI)

### Step 1: Open the Fee Management Modal
1. Navigate to the Client Allocation page
2. Click the "Manage Fees" button in the top toolbar

### Step 2: Review Current Fees
- Each fee displays:
  - Fee name (e.g., "Inspection Hour Rate")
  - Current rate
  - Current effective date (when this rate became active)
  - Number of historical versions (if any)

### Step 3: Set Effective Date
- At the top of the modal, you'll see an "Effective Date for Changes" field
- This defaults to today's date
- You can change this to:
  - **Today**: Fee change takes effect immediately
  - **Past date**: Use this if you need to backdate a fee change
  - **Future date**: Pre-schedule a fee change

### Step 4: Update Fee Rates
- Modify any fee amounts in the input fields
- Only changed fees will be saved (unchanged fees are skipped)

### Step 5: Save Changes
1. Click "Save All Changes"
2. Confirm the changes in the popup dialog
3. The system will create new fee history records
4. You'll see a confirmation message showing:
   - Number of fees updated
   - The effective date used
   - Any warnings or errors

## How to Use Fee Versioning (Code)

### Get the Rate for a Specific Date

```python
from main.models import InspectionFee
from datetime import date

# Get the inspection hour rate fee
fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')

# Get the rate that was active on a specific inspection date
inspection_date = date(2024, 6, 15)
rate = fee.get_rate_for_date(inspection_date)

print(f"Rate on {inspection_date}: R{rate}")
```

### Example: Calculate Inspection Cost Using Historical Rates

```python
from main.models import FoodSafetyAgencyInspection, InspectionFee

# Get an inspection
inspection = FoodSafetyAgencyInspection.objects.get(id=123)

# Get the fee rates that were active on the inspection date
hour_rate_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
km_rate_fee = InspectionFee.objects.get(fee_code='travel_rate_per_km')

# Get historical rates
hour_rate = hour_rate_fee.get_rate_for_date(inspection.date_of_inspection)
km_rate = km_rate_fee.get_rate_for_date(inspection.date_of_inspection)

# Calculate costs using historical rates
hour_cost = (inspection.hours or 0) * hour_rate
km_cost = (inspection.km_traveled or 0) * km_rate
total_cost = hour_cost + km_cost

print(f"Costs calculated using rates from {inspection.date_of_inspection}")
print(f"Hours: {inspection.hours} × R{hour_rate} = R{hour_cost}")
print(f"KM: {inspection.km_traveled} × R{km_rate} = R{km_cost}")
print(f"Total: R{total_cost}")
```

### Update Fees Programmatically

```python
from main.models import InspectionFee, FeeHistory
from datetime import date
from decimal import Decimal

# Get the fee
fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')

# Create a new fee history entry
FeeHistory.objects.create(
    fee=fee,
    rate=Decimal('525.00'),  # New rate
    effective_date=date(2025, 1, 1),  # Effective from Jan 1, 2025
    created_by=request.user,
    notes="Annual rate increase for 2025"
)

# Update the current rate on the fee
fee.rate = Decimal('525.00')
fee.save()
```

### Query Fee History

```python
from main.models import InspectionFee

# Get a fee and all its history
fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')

# Get all historical versions (ordered by effective date, newest first)
history = fee.history.all()

for record in history:
    print(f"{record.effective_date}: R{record.rate} (by {record.created_by})")
    if record.notes:
        print(f"  Notes: {record.notes}")
```

## Database Schema

### InspectionFee Table
- `id`: Primary key
- `fee_code`: Unique code (e.g., 'inspection_hour_rate')
- `fee_name`: Display name
- `rate`: Current rate (always reflects the latest rate)
- `description`: Fee description
- `last_updated`: When fee was last modified
- `updated_by`: User who last updated the fee

### FeeHistory Table (NEW)
- `id`: Primary key
- `fee_id`: Foreign key to InspectionFee
- `rate`: Historical rate
- `effective_date`: When this rate became/becomes active
- `created_by`: User who created this version
- `created_at`: When this history record was created
- `notes`: Optional notes about the change

## Important Notes

### Effective Date vs. Created Date
- **Effective Date**: When the rate becomes active for calculations
- **Created Date**: When the history record was created in the database

These can be different! For example:
- You might create a fee change today (created_at = 2024-12-13)
- But set it to take effect next month (effective_date = 2025-01-01)

### Duplicate Effective Dates
- You cannot have two different rates with the same effective date for the same fee
- If you try to create a duplicate, you'll get an error
- To change an effective date, delete the old history record first

### Deleting Fee History
- Be careful! Deleting fee history can break historical calculations
- Only delete history records if you're absolutely sure they're incorrect
- The system prevents deleting fee history if it would create gaps

### Migration Notes
- The initial migration creates history records for all existing fees
- All existing fees get a history record with effective_date = today
- This establishes a baseline for all future changes

## API Endpoints

### Get All Fees
```
GET /api/fees/get/
```

Response:
```json
{
  "fees": [
    {
      "id": 1,
      "fee_code": "inspection_hour_rate",
      "fee_name": "Inspection Hour Rate",
      "rate": 510.00,
      "description": "Hourly rate for inspections",
      "last_updated": "2024-12-13T10:30:00Z",
      "effective_date": "2024-01-01",
      "has_history": true,
      "history_count": 3
    }
  ]
}
```

### Update Fees
```
POST /api/fees/update/
Content-Type: application/json

{
  "fees": [
    {"id": 1, "rate": 525.00},
    {"id": 2, "rate": 7.00}
  ],
  "effective_date": "2025-01-01"
}
```

Response:
```json
{
  "success": true,
  "message": "Updated 2 fees successfully",
  "updated_count": 2,
  "effective_date": "2025-01-01",
  "warnings": []
}
```

## Troubleshooting

### "No fees have been modified"
- You're trying to save without changing any fee amounts
- Make at least one change before clicking "Save All Changes"

### "Duplicate effective date" error
- You're trying to create a fee with an effective date that already exists
- Delete the old history record first, or choose a different effective date

### Historical calculations seem wrong
- Verify that fee history exists for the date range you're querying
- Check that the effective dates are set correctly
- Make sure you're using `get_rate_for_date()` instead of accessing `.rate` directly

### Fee history not showing in UI
- Refresh the page to reload fee data
- Check that migrations have been run: `python manage.py migrate main`
- Verify that FeeHistory records exist in the database

## Best Practices

1. **Always set meaningful effective dates**
   - Use the actual date when the fee change should take effect
   - Don't backdate unless absolutely necessary

2. **Add notes to fee changes**
   - Document why fees were changed
   - Reference policy documents or approval numbers
   - Future you will thank present you!

3. **Pre-schedule fee changes**
   - If you know fees will change in the future, create them in advance
   - Set the effective date to the future date
   - The system will automatically use the correct rate based on inspection dates

4. **Review before saving**
   - Double-check all fee amounts before saving
   - Verify the effective date is correct
   - Remember: you can't undo without manually deleting history records

5. **Regular audits**
   - Periodically review fee history to ensure accuracy
   - Check for unexpected gaps or duplicates
   - Verify that all changes are properly documented

## Support

For questions or issues with the fee versioning system:
1. Check this guide first
2. Review the code comments in `main/models.py` (FeeHistory model)
3. Check the API implementation in `main/views/data_views.py`
4. Contact the development team if you need assistance
