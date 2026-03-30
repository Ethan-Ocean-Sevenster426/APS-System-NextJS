"""
Update inspection fees to 2026 rates (effective 01 April 2026).

Run on server:
  cd /var/www/APS-System
  venv/bin/python manage.py shell < update_2026_fees.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
try:
    django.setup()
except RuntimeError:
    pass

from main.models import InspectionFee, FeeHistory
from decimal import Decimal
from datetime import date

EFFECTIVE_DATE = date(2026, 4, 1)

NEW_RATES = {
    'inspection_hour_rate': Decimal('540.60'),
    'inspection_km_rate': Decimal('6.50'),
    'lab_test_fat': Decimal('875.56'),
    'lab_test_protein': Decimal('533.18'),
    'lab_test_calcium': Decimal('401.74'),
    'lab_test_dna': Decimal('2761.30'),
}

print(f"\n{'='*60}")
print(f"  Updating fees to 2026 rates (effective {EFFECTIVE_DATE})")
print(f"{'='*60}\n")

for fee_code, new_rate in NEW_RATES.items():
    fee = InspectionFee.objects.filter(fee_code=fee_code).first()
    if fee:
        old_rate = fee.rate
        if old_rate != new_rate:
            # Create history entry
            FeeHistory.objects.update_or_create(
                fee=fee, effective_date=EFFECTIVE_DATE,
                defaults={'rate': new_rate, 'notes': '2026 DALRRD approved rates'}
            )
            fee.rate = new_rate
            fee.save()
            print(f"  [UPDATED] {fee_code}: R{old_rate} -> R{new_rate}")
        else:
            print(f"  [OK]      {fee_code}: already R{new_rate}")
    else:
        print(f"  [SKIP]    {fee_code}: not found in database")

print(f"\n{'='*60}")
print(f"  Done! Fees updated for 2026.")
print(f"{'='*60}\n")
