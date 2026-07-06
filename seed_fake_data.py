#!/usr/bin/env python
"""
Seed the local database with fake data for testing/checking the app.
Idempotent-ish: safe to run once on an empty DB. Creates inspectors,
clients, inspection groups, and child inspections linked together.

Run:  python seed_fake_data.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, time, timedelta
from decimal import Decimal
import random

from django.contrib.auth.models import User
from main.models import (
    Client, InspectionGroup, FoodSafetyAgencyInspection, InspectorMapping,
)

random.seed(42)  # deterministic fake data

# ---------------------------------------------------------------------------
# 1. Inspector / staff users
# ---------------------------------------------------------------------------
STAFF = [
    # username, full name, role, server inspector_id
    ("jsmith",   "John Smith",     "inspector",         101),
    ("jdoe",     "Jane Doe",       "inspector",         102),
    ("mjohnson", "Mike Johnson",   "inspector",         103),
    ("swilliams","Sarah Williams", "inspector",         104),
    ("manager1", "Peter Manager",  "inspector_manager", 105),
    ("labtech1", "Lisa Labtech",   "lab_technician",    106),
    ("adminuser","Alan Admin",     "admin",             107),
]

print("Creating staff users...")
inspectors = []  # (id, name) for inspection assignment
for username, full, role, sid in STAFF:
    first, last = full.split(" ", 1)
    u, created = User.objects.get_or_create(
        username=username,
        defaults=dict(first_name=first, last_name=last,
                      email=f"{username}@fsa-local.test", is_staff=True),
    )
    u.first_name, u.last_name, u.role = first, last, role
    u.set_password("password123")
    u.save()
    print(f"  {'+' if created else '~'} {username} ({role})")
    if role in ("inspector", "inspector_manager"):
        inspectors.append((sid, full))
    # Inspector mapping (server id -> name)
    InspectorMapping.objects.get_or_create(
        inspector_id=sid, defaults=dict(inspector_name=full))

# ---------------------------------------------------------------------------
# 2. Clients
# ---------------------------------------------------------------------------
CLIENTS = [
    ("ABC Meats",         "Cape Town",     "Butchery",  "Independent",          "Retailer"),
    ("Fresh Farms",       "Stellenbosch",  "Producer",  "Independent",          "Producer"),
    ("Quality Foods",     "Johannesburg",  "Re-Packer", "Pick n Pay",           "Corporate Store"),
    ("Farm Direct",       "Pretoria",      "Producer",  "Independent",          "Producer"),
    ("Premium Poultry",   "Durban",        "Abattoir",  "Independent",          "Producer"),
    ("City Butchers",     "Cape Town",     "Butchery",  "Independent",          "Retailer"),
    ("Rural Meats",       "Bloemfontein",  "Butchery",  "Independent",          "Retailer"),
    ("Metro Foods",       "Johannesburg",  "Retailer",  "Shoprite",             "Corporate Store"),
    ("Coastal Seafoods",  "Gqeberha",      "Processor", "Independent",          "Processor"),
    ("Highveld Dairy",    "Nelspruit",     "Producer",  "Woolworths",           "Franchise Store"),
    ("Karoo Lamb Co",     "Beaufort West", "Abattoir",  "Independent",          "Producer"),
    ("Sunrise Eggs",      "Polokwane",     "Producer",  "Pick n Pay",           "Corporate Store"),
]

print("\nCreating clients...")
clients = []
for name, town, facility, corp, gtype in CLIENTS:
    c, created = Client.objects.get_or_create(
        name=name,
        defaults=dict(
            town=town, facility_type=facility, corporate_group=corp,
            group_type=gtype,
            email=f"{name.lower().replace(' ', '.')}@client-local.test",
            internal_account_code=f"ACC-{random.randint(1000, 9999)}",
        ),
    )
    clients.append(c)
    print(f"  {'+' if created else '~'} {c.name} ({c.client_id})")

# ---------------------------------------------------------------------------
# 3. Inspection groups + child inspections
# ---------------------------------------------------------------------------
COMMODITIES = ["POULTRY", "RAW", "PMP", "EGGS", "DAIRY"]
PRODUCTS = [
    ("Mince", "Ground Meat"), ("Boerewors", "Sausage"),
    ("Burger Patties", "Processed Meat"), ("Chicken Breast", "Poultry"),
    ("Eggs Grade A", "Eggs"), ("Milk Fresh", "Dairy"),
]
LABS = ["lab_a", "lab_b", "lab_c", "lab_d", "lab_e", "lab_f"]

print("\nCreating inspection groups + inspections...")
today = date.today()
remote_seq = 5000
groups_made = 0
insp_made = 0

# 45 group visits spread over the last 120 days
for g in range(45):
    client = random.choice(clients)
    sid, sname = random.choice(inspectors)
    d = today - timedelta(days=random.randint(0, 120))
    km = Decimal(str(random.uniform(10, 200))).quantize(Decimal("0.01"))
    hrs = Decimal(str(random.uniform(2, 8))).quantize(Decimal("0.01"))

    group = InspectionGroup.objects.create(
        client=client,
        client_name=client.name,
        date_of_inspection=d,
        inspector_name=sname,
        town=client.town,
        facility_type=client.facility_type,
        group_type=client.group_type,
        corporate_group=client.corporate_group,
        km_traveled=km,
        hours=hrs,
        travel_start_time=time(7, 30),
        travel_end_time=time(16, 0),
        is_manual=True,
    )
    groups_made += 1

    # 1-3 commodity inspections per visit
    for _ in range(random.randint(1, 3)):
        remote_seq += 1
        product_name, product_class = random.choice(PRODUCTS)
        FoodSafetyAgencyInspection.objects.create(
            inspection_group=group,
            client=client,
            commodity=random.choice(COMMODITIES),
            date_of_inspection=d,
            start_of_inspection=time(8, 0),
            end_of_inspection=time(12, 0),
            inspection_location_type_id=random.randint(1, 5),
            is_direction_present_for_this_inspection=random.choice([True, False]),
            inspector_id=sid,
            inspector_name=sname,
            latitude=f"-{random.uniform(25, 34):.6f}",
            longitude=f"{random.uniform(18, 32):.6f}",
            product_name=product_name,
            product_class=product_class,
            is_sample_taken=random.choice([True, False]),
            bought_sample=Decimal(str(random.uniform(50, 500))).quantize(Decimal("0.01")),
            inspection_travel_distance_km=km,
            km_traveled=km,
            hours=hrs,
            approved_status=random.choice(["PENDING", "APPROVED", "APPROVED"]),
            lab=random.choice(LABS),
            remote_id=remote_seq,
            client_name=client.name,
            internal_account_code=client.internal_account_code,
            fat=random.choice([True, False]),
            protein=random.choice([True, False]),
            calcium=random.choice([True, False]),
            dna=random.choice([True, False]),
            needs_retest=random.choice(["YES", "NO"]),
            is_sent=random.choice([True, False]),
        )
        insp_made += 1

# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("SEED SUMMARY")
print("=" * 60)
print(f"Users total:         {User.objects.count()}")
print(f"Inspector mappings:  {InspectorMapping.objects.count()}")
print(f"Clients:             {Client.objects.count()}")
print(f"Inspection groups:   {InspectionGroup.objects.count()}  (+{groups_made} this run)")
print(f"Inspections:         {FoodSafetyAgencyInspection.objects.count()}  (+{insp_made} this run)")
print("=" * 60)
