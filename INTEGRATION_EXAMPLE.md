# Integrating Fee Versioning with Existing Code

This document provides real-world examples of how to update existing code to use the new fee versioning system.

## Example 1: Updating Invoice Generation

### Before (Using Current Rate)
```python
def generate_invoice_items(inspection):
    """Generate invoice items - BEFORE fee versioning"""
    from main.models import InspectionFee

    # This always uses the current rate, regardless of inspection date
    hour_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
    km_fee = InspectionFee.objects.get(fee_code='travel_rate_per_km')

    items = []

    if inspection.hours:
        items.append({
            'description': 'Inspection Hours',
            'quantity': inspection.hours,
            'rate': float(hour_fee.rate),  # Uses current rate!
            'total': float(inspection.hours * hour_fee.rate)
        })

    if inspection.km_traveled:
        items.append({
            'description': 'Travel (KM)',
            'quantity': inspection.km_traveled,
            'rate': float(km_fee.rate),  # Uses current rate!
            'total': float(inspection.km_traveled * km_fee.rate)
        })

    return items
```

### After (Using Historical Rates)
```python
def generate_invoice_items(inspection):
    """Generate invoice items - AFTER fee versioning"""
    from main.models import InspectionFee

    # Get the fees
    hour_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
    km_fee = InspectionFee.objects.get(fee_code='travel_rate_per_km')

    # Get the rates that were active on the inspection date
    hour_rate = hour_fee.get_rate_for_date(inspection.date_of_inspection)
    km_rate = km_fee.get_rate_for_date(inspection.date_of_inspection)

    items = []

    if inspection.hours:
        items.append({
            'description': 'Inspection Hours',
            'quantity': inspection.hours,
            'rate': float(hour_rate),  # Uses historical rate!
            'total': float(inspection.hours * hour_rate)
        })

    if inspection.km_traveled:
        items.append({
            'description': 'Travel (KM)',
            'quantity': inspection.km_traveled,
            'rate': float(km_rate),  # Uses historical rate!
            'total': float(inspection.km_traveled * km_rate)
        })

    return items
```

## Example 2: Updating the get_fee_rate Helper Function

### Current Implementation (in core_views.py)
```python
def get_fee_rate(fee_code, default_value):
    """Get fee rate from database, fallback to default if not found"""
    try:
        from ..models import InspectionFee
        fee = InspectionFee.objects.filter(fee_code=fee_code).first()
        return float(fee.rate) if fee else default_value
    except:
        return default_value
```

### Updated Implementation (with date support)
```python
def get_fee_rate(fee_code, default_value, inspection_date=None):
    """
    Get fee rate from database, fallback to default if not found.

    Args:
        fee_code: Fee code to lookup (e.g., 'inspection_hour_rate')
        default_value: Fallback value if fee not found
        inspection_date: Date to get rate for (optional, defaults to current rate)

    Returns:
        Float rate value
    """
    try:
        from ..models import InspectionFee
        fee = InspectionFee.objects.filter(fee_code=fee_code).first()
        if not fee:
            return default_value

        # If inspection_date provided, get historical rate
        if inspection_date:
            return float(fee.get_rate_for_date(inspection_date))

        # Otherwise return current rate
        return float(fee.rate)
    except:
        return default_value
```

### Updated Usage
```python
def generate_visit_hours_km_items(inspection_id, inspection, invoice_ref, rfi_ref,
                                   product_type, city, lab_name, total_hours, total_km):
    """Generate HOURS and KM line items with historical rates"""
    items = []

    # Load pricing using historical rates based on inspection date
    INSPECTION_HOUR_RATE = get_fee_rate(
        'inspection_hour_rate',
        510.00,
        inspection.date_of_inspection  # Pass inspection date
    )
    TRAVEL_RATE_PER_KM = get_fee_rate(
        'travel_rate_per_km',
        6.50,
        inspection.date_of_inspection  # Pass inspection date
    )

    # Rest of the function remains the same...
```

## Example 3: Batch Invoice Generation with Proper Historical Rates

### Scenario
Generate invoices for multiple inspections from different dates, ensuring each uses the correct historical rate.

```python
def generate_monthly_invoices(year, month):
    """
    Generate invoices for all inspections in a given month.
    Each invoice uses the fee rates that were active on the inspection date.
    """
    from main.models import FoodSafetyAgencyInspection, InspectionFee
    from datetime import date

    # Get all inspections for the month
    inspections = FoodSafetyAgencyInspection.objects.filter(
        date_of_inspection__year=year,
        date_of_inspection__month=month
    )

    # Get fee objects (we'll reuse these for all inspections)
    hour_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
    km_fee = InspectionFee.objects.get(fee_code='travel_rate_per_km')
    sample_fee = InspectionFee.objects.get(fee_code='sample_collection_rate')

    invoices = []

    for inspection in inspections:
        # Get rates for THIS inspection's date
        hour_rate = hour_fee.get_rate_for_date(inspection.date_of_inspection)
        km_rate = km_fee.get_rate_for_date(inspection.date_of_inspection)
        sample_rate = sample_fee.get_rate_for_date(inspection.date_of_inspection)

        # Calculate costs
        hour_cost = (inspection.hours or 0) * hour_rate
        km_cost = (inspection.km_traveled or 0) * km_rate
        sample_cost = sample_rate if inspection.is_sample_taken else 0

        invoice = {
            'inspection_id': inspection.id,
            'inspection_date': inspection.date_of_inspection,
            'client': inspection.client_name,
            'items': [
                {
                    'description': 'Inspection Hours',
                    'quantity': inspection.hours,
                    'rate': float(hour_rate),
                    'amount': float(hour_cost)
                },
                {
                    'description': 'Travel (KM)',
                    'quantity': inspection.km_traveled,
                    'rate': float(km_rate),
                    'amount': float(km_cost)
                },
                {
                    'description': 'Sample Collection',
                    'quantity': 1 if inspection.is_sample_taken else 0,
                    'rate': float(sample_rate),
                    'amount': float(sample_cost)
                }
            ],
            'total': float(hour_cost + km_cost + sample_cost),
            'rates_effective_date': inspection.date_of_inspection
        }

        invoices.append(invoice)

    return invoices
```

## Example 4: Fee History Report

### Generate a report showing fee changes over time

```python
def generate_fee_history_report(fee_code, start_date=None, end_date=None):
    """
    Generate a report showing all fee changes for a specific fee.

    Args:
        fee_code: Fee code to report on
        start_date: Optional start date filter
        end_date: Optional end date filter

    Returns:
        List of fee history records with change information
    """
    from main.models import InspectionFee
    from datetime import date

    fee = InspectionFee.objects.get(fee_code=fee_code)

    # Get history, optionally filtered by date range
    history_query = fee.history.all()

    if start_date:
        history_query = history_query.filter(effective_date__gte=start_date)
    if end_date:
        history_query = history_query.filter(effective_date__lte=end_date)

    report = []
    previous_rate = None

    for record in history_query.order_by('effective_date'):
        change_amount = None
        change_percent = None

        if previous_rate:
            change_amount = record.rate - previous_rate
            change_percent = (change_amount / previous_rate) * 100

        report.append({
            'effective_date': record.effective_date,
            'rate': float(record.rate),
            'changed_by': record.created_by.username if record.created_by else 'Unknown',
            'changed_at': record.created_at,
            'notes': record.notes,
            'change_amount': float(change_amount) if change_amount else None,
            'change_percent': float(change_percent) if change_percent else None,
            'previous_rate': float(previous_rate) if previous_rate else None
        })

        previous_rate = record.rate

    return {
        'fee_name': fee.fee_name,
        'fee_code': fee.fee_code,
        'current_rate': float(fee.rate),
        'total_changes': len(report),
        'history': report
    }
```

### Usage Example
```python
# Generate report for inspection hour rate for 2024
report = generate_fee_history_report(
    'inspection_hour_rate',
    start_date=date(2024, 1, 1),
    end_date=date(2024, 12, 31)
)

print(f"Fee: {report['fee_name']}")
print(f"Current Rate: R{report['current_rate']}")
print(f"Changes in 2024: {report['total_changes']}")
print("\nHistory:")

for change in report['history']:
    print(f"  {change['effective_date']}: R{change['rate']}", end='')
    if change['change_percent']:
        print(f" ({change['change_percent']:+.1f}%)", end='')
    if change['notes']:
        print(f" - {change['notes']}", end='')
    print()
```

## Example 5: API Endpoint for Historical Rate Lookup

### Add a new API endpoint to get rates for a specific date

```python
@login_required
def get_fee_rate_for_date(request):
    """
    Get fee rate for a specific date.

    Query Parameters:
        fee_code: Fee code (required)
        date: ISO date string (required)

    Returns:
        JSON with rate information
    """
    import json
    from datetime import date
    from main.models import InspectionFee

    fee_code = request.GET.get('fee_code')
    date_str = request.GET.get('date')

    if not fee_code or not date_str:
        return JsonResponse({
            'success': False,
            'message': 'fee_code and date are required'
        }, status=400)

    try:
        # Parse date
        lookup_date = date.fromisoformat(date_str)

        # Get fee
        fee = InspectionFee.objects.get(fee_code=fee_code)

        # Get rate for date
        rate = fee.get_rate_for_date(lookup_date)

        # Get the history record for additional info
        history = fee.history.filter(effective_date__lte=lookup_date).first()

        return JsonResponse({
            'success': True,
            'fee_code': fee_code,
            'fee_name': fee.fee_name,
            'date': date_str,
            'rate': float(rate),
            'effective_date': history.effective_date.isoformat() if history else None,
            'notes': history.notes if history else None
        })

    except InspectionFee.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': f'Fee with code {fee_code} not found'
        }, status=404)
    except ValueError as e:
        return JsonResponse({
            'success': False,
            'message': f'Invalid date format: {str(e)}'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)
```

### Usage from JavaScript
```javascript
// Get the inspection hour rate for a specific date
fetch('/api/fees/rate-for-date/?fee_code=inspection_hour_rate&date=2024-06-15')
    .then(response => response.json())
    .then(data => {
        console.log(`Rate on ${data.date}: R${data.rate}`);
        console.log(`Effective since: ${data.effective_date}`);
    });
```

## Example 6: Excel Export with Historical Rates

### Export inspection costs with the correct historical rates

```python
def export_inspections_to_excel(inspections, filename):
    """
    Export inspections to Excel with accurate historical cost calculations.
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from main.models import InspectionFee

    # Get fee objects
    hour_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
    km_fee = InspectionFee.objects.get(fee_code='travel_rate_per_km')

    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inspections"

    # Headers
    headers = [
        'Inspection ID', 'Date', 'Client', 'Inspector',
        'Hours', 'Hour Rate', 'Hour Cost',
        'KM', 'KM Rate', 'KM Cost',
        'Total Cost', 'Rate Effective Date'
    ]

    ws.append(headers)

    # Style headers
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color='366092', end_color='366092', fill_type='solid')
        cell.font = Font(color='FFFFFF', bold=True)

    # Add data
    for inspection in inspections:
        # Get historical rates
        hour_rate = hour_fee.get_rate_for_date(inspection.date_of_inspection)
        km_rate = km_fee.get_rate_for_date(inspection.date_of_inspection)

        # Calculate costs
        hour_cost = (inspection.hours or 0) * hour_rate
        km_cost = (inspection.km_traveled or 0) * km_rate
        total_cost = hour_cost + km_cost

        # Get effective date
        history = hour_fee.history.filter(
            effective_date__lte=inspection.date_of_inspection
        ).first()
        effective_date = history.effective_date if history else None

        ws.append([
            inspection.id,
            inspection.date_of_inspection,
            inspection.client_name,
            inspection.inspector_name,
            float(inspection.hours or 0),
            float(hour_rate),
            float(hour_cost),
            float(inspection.km_traveled or 0),
            float(km_rate),
            float(km_cost),
            float(total_cost),
            effective_date
        ])

    # Save
    wb.save(filename)
    return filename
```

## Integration Checklist

When integrating fee versioning into existing code:

- [ ] Identify all places where `fee.rate` is accessed directly
- [ ] Determine if each access should use historical or current rate
- [ ] Update to use `fee.get_rate_for_date(inspection_date)` where appropriate
- [ ] Update helper functions to accept optional date parameter
- [ ] Update API endpoints to return historical rate information
- [ ] Update exports to use historical rates
- [ ] Update reports to show rate effective dates
- [ ] Add tests for historical rate calculations
- [ ] Update documentation with examples
- [ ] Train users on new fee management features

## Common Patterns

### Pattern 1: Always Use Historical Rates for Past Data
```python
# For any calculation involving past inspections
rate = fee.get_rate_for_date(inspection.date_of_inspection)
```

### Pattern 2: Use Current Rate for Estimates/Quotes
```python
# For future estimates or quotes
rate = fee.rate  # Current rate
```

### Pattern 3: Cache Fee Objects, Not Rates
```python
# Good: Cache the fee object, calculate rate per inspection
hour_fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
for inspection in inspections:
    rate = hour_fee.get_rate_for_date(inspection.date_of_inspection)

# Bad: Cache the rate (doesn't account for different dates)
hour_rate = hour_fee.rate
for inspection in inspections:
    cost = inspection.hours * hour_rate  # Wrong! Uses same rate for all dates
```

## Conclusion

The fee versioning system is designed to integrate seamlessly with existing code. The key is to use `get_rate_for_date()` whenever calculating costs for past inspections, while using the current `rate` for quotes and estimates.
