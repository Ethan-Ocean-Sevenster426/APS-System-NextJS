#!/usr/bin/env python
"""Script to add test inspections to FoodSafetyAgencyInspection table."""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from datetime import date, time, timedelta
from decimal import Decimal
import random

def create_test_inspections():
    """Create test inspections in FoodSafetyAgencyInspection table."""

    # Check current count
    current_count = FoodSafetyAgencyInspection.objects.count()
    print(f"Current inspections in FoodSafetyAgencyInspection: {current_count}")

    if current_count > 0:
        print("Table already has data. Skipping creation.")
        return

    # Test data
    inspectors = [
        (1, "John Smith"),
        (2, "Jane Doe"),
        (3, "Mike Johnson"),
        (4, "Sarah Williams"),
        (5, "Admin User"),
    ]

    commodities = ["POULTRY", "RAW", "PMP", "EGGS", "DAIRY"]

    clients = [
        ("ABC Meats", "ABC001"),
        ("Fresh Farms", "FF002"),
        ("Quality Foods", "QF003"),
        ("Farm Direct", "FD004"),
        ("Premium Poultry", "PP005"),
        ("City Butchers", "CB006"),
        ("Rural Meats", "RM007"),
        ("Metro Foods", "MF008"),
    ]

    products = [
        ("Mince", "Ground Meat"),
        ("Boerewors", "Sausage"),
        ("Burger Patties", "Processed Meat"),
        ("Chicken Breast", "Poultry"),
        ("Eggs Grade A", "Eggs"),
        ("Milk Fresh", "Dairy"),
    ]

    labs = ["lab_a", "lab_b", "lab_c", "lab_d", "lab_e", "lab_f"]

    # Create 30 test inspections
    inspections_created = 0
    base_date = date.today() - timedelta(days=30)

    for i in range(30):
        inspector_id, inspector_name = random.choice(inspectors)
        client_name, account_code = random.choice(clients)
        product_name, product_class = random.choice(products)
        commodity = random.choice(commodities)

        inspection_date = base_date + timedelta(days=random.randint(0, 30))

        inspection = FoodSafetyAgencyInspection.objects.create(
            commodity=commodity,
            date_of_inspection=inspection_date,
            start_of_inspection=time(8, 0),
            end_of_inspection=time(12, 0),
            inspection_location_type_id=random.randint(1, 5),
            is_direction_present_for_this_inspection=random.choice([True, False]),
            inspector_id=inspector_id,
            inspector_name=inspector_name,
            latitude=f"-{random.uniform(25, 34):.6f}",
            longitude=f"{random.uniform(18, 32):.6f}",
            product_name=product_name,
            product_class=product_class,
            is_sample_taken=random.choice([True, False, None]),
            bought_sample=Decimal(str(random.uniform(50, 500))).quantize(Decimal('0.01')) if random.choice([True, False]) else None,
            inspection_travel_distance_km=Decimal(str(random.uniform(10, 200))).quantize(Decimal('0.01')),
            km_traveled=Decimal(str(random.uniform(10, 200))).quantize(Decimal('0.01')),
            hours=Decimal(str(random.uniform(2, 8))).quantize(Decimal('0.01')),
            approved_status=random.choice(['PENDING', 'APPROVED']),
            lab=random.choice(labs),
            remote_id=1000 + i,
            client_name=client_name,
            internal_account_code=account_code,
            fat=random.choice([True, False]),
            protein=random.choice([True, False]),
            calcium=random.choice([True, False]),
            dna=random.choice([True, False]),
            needs_retest=random.choice(['YES', 'NO', None]),
            is_sent=random.choice([True, False]),
        )
        inspections_created += 1
        print(f"Created inspection {inspections_created}: {inspector_name} - {client_name} - {inspection_date}")

    print(f"\nTotal inspections created: {inspections_created}")
    print(f"New count in FoodSafetyAgencyInspection: {FoodSafetyAgencyInspection.objects.count()}")

if __name__ == "__main__":
    create_test_inspections()
