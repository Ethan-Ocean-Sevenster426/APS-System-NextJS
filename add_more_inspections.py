#!/usr/bin/env python
"""Script to add more inspections to existing grouped inspections."""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection
from datetime import date, time
from decimal import Decimal
import random

def add_more_inspections():
    """Add more inspections to specific client groups."""

    # Target clients - the ones shown in the grouped view
    target_clients = [
        ("City Butchers Dev User", "CB-DEV-001"),
        ("Chicken Butchery Dev User", "CHK-DEV-002"),
    ]

    # Today's date (13/01/2026)
    inspection_date = date(2026, 1, 13)

    inspectors = [
        (1, "John Smith"),
        (2, "Jane Doe"),
        (3, "Mike Johnson"),
        (4, "Sarah Williams"),
        (5, "Dev Inspector"),
    ]

    products_by_commodity = {
        "POULTRY": [
            ("Chicken Breast", "Fresh Poultry"),
            ("Chicken Thighs", "Fresh Poultry"),
            ("Chicken Wings", "Fresh Poultry"),
            ("Chicken Drumsticks", "Fresh Poultry"),
            ("Whole Chicken", "Fresh Poultry"),
        ],
        "RAW": [
            ("Beef Mince", "Ground Meat"),
            ("Boerewors", "Sausage"),
            ("Burger Patties", "Processed Meat"),
            ("Pork Chops", "Fresh Meat"),
            ("Lamb Chops", "Fresh Meat"),
            ("Steak", "Fresh Meat"),
        ],
    }

    labs = ["lab_a", "lab_b", "lab_c", "lab_d", "lab_e", "lab_f"]

    inspections_created = 0

    # Get the max remote_id to avoid conflicts
    max_remote = FoodSafetyAgencyInspection.objects.order_by('-remote_id').first()
    next_remote_id = (max_remote.remote_id + 1) if max_remote and max_remote.remote_id else 5000

    for client_name, account_code in target_clients:
        # Add 4-6 inspections per client
        num_inspections = random.randint(4, 6)

        # Assign commodity based on client name
        if "Chicken" in client_name:
            commodity = "POULTRY"
        else:
            commodity = "RAW"

        products = products_by_commodity.get(commodity, products_by_commodity["RAW"])

        print(f"\nAdding {num_inspections} inspections for {client_name}:")

        for i in range(num_inspections):
            inspector_id, inspector_name = random.choice(inspectors)
            product_name, product_class = random.choice(products)

            inspection = FoodSafetyAgencyInspection.objects.create(
                commodity=commodity,
                date_of_inspection=inspection_date,
                start_of_inspection=time(8 + i, 0),
                end_of_inspection=time(9 + i, 30),
                inspection_location_type_id=random.randint(1, 5),
                is_direction_present_for_this_inspection=True,
                inspector_id=inspector_id,
                inspector_name=inspector_name,
                latitude=f"-{random.uniform(25, 34):.6f}",
                longitude=f"{random.uniform(18, 32):.6f}",
                product_name=product_name,
                product_class=product_class,
                is_sample_taken=random.choice([True, False]),
                bought_sample=Decimal(str(random.uniform(100, 400))).quantize(Decimal('0.01')) if random.choice([True, False]) else None,
                inspection_travel_distance_km=Decimal(str(random.uniform(10, 100))).quantize(Decimal('0.01')),
                km_traveled=Decimal(str(random.uniform(10, 100))).quantize(Decimal('0.01')),
                hours=Decimal(str(random.uniform(1, 4))).quantize(Decimal('0.01')),
                approved_status='APPROVED',
                lab=random.choice(labs),
                remote_id=next_remote_id,
                client_name=client_name,
                internal_account_code=account_code,
                fat=random.choice([True, False]),
                protein=random.choice([True, False]),
                calcium=random.choice([True, False]),
                dna=random.choice([True, False]),
                needs_retest=random.choice(['YES', 'NO', None]),
                is_sent=False,
                is_manual=True,
            )
            next_remote_id += 1
            inspections_created += 1
            print(f"  - {product_name} ({product_class}) by {inspector_name}")

    print(f"\n{'='*50}")
    print(f"Total new inspections created: {inspections_created}")

    # Show updated counts per client
    print(f"\nUpdated inspection counts per client:")
    for client_name, _ in target_clients:
        count = FoodSafetyAgencyInspection.objects.filter(
            client_name=client_name,
            date_of_inspection=inspection_date
        ).count()
        print(f"  {client_name}: {count} inspections on {inspection_date}")

if __name__ == "__main__":
    add_more_inspections()
