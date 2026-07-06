"""
Seed the InspectionFee table with the standard fee rates.

The analytics revenue, invoice generation and export sheet all read their rates
from InspectionFee. On a fresh database the table is empty, which makes every
revenue figure come out as R0. This command creates the canonical fee set (the
same defaults hard-coded throughout the invoice/export code) if they are missing.

Idempotent: existing fees are left untouched unless --force is given.

    python manage.py seed_default_fees
    python manage.py seed_default_fees --force   # overwrite existing rates too
"""
import datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from main.models import InspectionFee, FeeHistory

# fee_code, fee_name, rate  — matches the get_fee_rate() defaults in core_views.py
DEFAULT_FEES = [
    ("inspection_hour_rate", "Inspection (per hour)", 540.60),
    ("inspection_overtime_rate", "Inspection Overtime (per hour)", 567.00),
    ("inspection_sunday_rate", "Inspection Sunday (per hour)", 680.00),
    ("inspection_km_rate", "Travel (per km)", 6.50),
    ("sample_collection", "Sample Collection", 0.00),
    ("lab_test_fat", "Lab Test — Fat Content", 875.56),
    ("lab_test_protein", "Lab Test — Protein", 533.18),
    ("lab_test_calcium", "Lab Test — Calcium", 401.74),
    ("lab_test_dna", "Lab Test — DNA", 2761.30),
    ("soya_test_rate", "Lab Test — Soya", 1665.00),
    ("starch_test_rate", "Lab Test — Starch", 1472.00),
    ("physical_test_rate", "Lab Test — Physical", 200.00),
]

# Effective date for the seeded history row — early enough to cover any inspection.
SEED_EFFECTIVE_DATE = datetime.date(2020, 1, 1)


class Command(BaseCommand):
    help = "Seed the InspectionFee table with the standard fee rates (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force", action="store_true",
            help="Overwrite the rate on fees that already exist.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options["force"]
        created, updated, skipped = 0, 0, 0

        for code, name, rate in DEFAULT_FEES:
            fee = InspectionFee.objects.filter(fee_code=code).first()
            if fee is None:
                fee = InspectionFee.objects.create(fee_code=code, fee_name=name, rate=rate)
                created += 1
            elif force:
                fee.rate = rate
                fee.fee_name = fee.fee_name or name
                fee.save(update_fields=["rate", "fee_name"])
                updated += 1
            else:
                skipped += 1

            # Ensure a baseline history row exists so date-based rate lookups work.
            if not fee.history.filter(effective_date=SEED_EFFECTIVE_DATE).exists():
                FeeHistory.objects.create(
                    fee=fee, rate=fee.rate, effective_date=SEED_EFFECTIVE_DATE,
                    notes="Seeded default rate",
                )

        self.stdout.write(self.style.SUCCESS(
            f"Fees seeded — created={created}, updated={updated}, skipped(existing)={skipped}, "
            f"total={InspectionFee.objects.count()}"
        ))
