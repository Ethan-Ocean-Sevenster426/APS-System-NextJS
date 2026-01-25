"""
Populate database with admin user and sample inspections.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth.models import User
from main.models import FoodSafetyAgencyInspection, Client
from datetime import date, timedelta
from decimal import Decimal
import random

# Create admin user with developer role
print("Creating admin user...")
if User.objects.filter(username='admin').exists():
    user = User.objects.get(username='admin')
    print("Admin user already exists, updating...")
else:
    user = User.objects.create_user(
        username='admin',
        email='admin@foodsafety.co.za',
        password='admin123',
        first_name='Admin',
        last_name='Developer'
    )
    print("Admin user created.")

user.role = 'developer'
user.is_staff = True
user.is_superuser = True
user.phone_number = '+27 82 123 4567'
user.department = 'IT Development'
user.employee_id = 'DEV001'
user.save()
print(f"Admin user '{user.username}' with role '{user.role}' ready.")

# Sample data for inspections
inspectors = [
    ('Cinga Ngongo', 1001),
    ('Thabo Molefe', 1002),
    ('Sarah van der Berg', 1003),
    ('David Nkosi', 1004),
    ('Maria Joubert', 1005),
]

client_names = [
    'Pick n Pay Sandton', 'Woolworths Rosebank', 'Checkers Fourways',
    'Spar Midrand', 'Food Lovers Centurion', 'Shoprite Pretoria',
    'OK Foods Randburg', 'Boxer Soweto', 'Cambridge Foods Mamelodi',
    'Meat World Benoni', 'Ultra Liquors Springs', 'Makro Germiston',
    'Game Stores Boksburg', 'Fruit & Veg City Kempton Park', 'Freshmark Edenvale',
    'USave Tembisa', 'KwikSpar Alberton', 'SuperSpar Vereeniging',
    'Tops Vanderbijlpark', 'Liquor City Krugersdorp',
]

towns = [
    'Johannesburg', 'Pretoria', 'Sandton', 'Midrand', 'Centurion',
    'Randburg', 'Fourways', 'Rosebank', 'Benoni', 'Germiston',
    'Kempton Park', 'Boksburg', 'Springs', 'Alberton', 'Vereeniging',
]

commodities = ['RAW', 'POULTRY', 'PMP', 'EGGS', 'DAIRY']

product_names = [
    'Mince', 'Boerewors', 'Burger Patties', 'Chicken Breast', 'Chicken Wings',
    'Polony', 'Vienna', 'Bacon', 'Ham', 'Cheese',
    'Eggs Free Range', 'Eggs Caged', 'Milk Full Cream', 'Yoghurt', 'Butter',
]

product_classes = [
    'Raw species sausage / wors', 'Raw minced meat', 'Processed meat',
    'Fresh poultry', 'Cured meat', 'Dairy product', 'Egg product',
]

labs = ['lab_a', 'lab_b', 'lab_c', 'lab_d', 'lab_e', 'lab_f']

# Create some clients first
print("\nCreating clients...")
clients = []
for i, name in enumerate(client_names):
    client, created = Client.objects.get_or_create(
        client_id=f'CL{(i+1):05d}',
        defaults={
            'name': name,
            'internal_account_code': f'IAC{(i+1):04d}',
            'email': f'contact{i+1}@{name.lower().replace(" ", "").replace("&", "")[:10]}.co.za',
        }
    )
    clients.append(client)
    if created:
        print(f"  Created client: {name}")

print(f"Total clients: {len(clients)}")

# Create 60 inspections
print("\nCreating 60 inspections...")
base_date = date.today() - timedelta(days=90)

for i in range(60):
    inspector_name, inspector_id = random.choice(inspectors)
    client = random.choice(clients)
    inspection_date = base_date + timedelta(days=random.randint(0, 90))
    commodity = random.choice(commodities)

    inspection = FoodSafetyAgencyInspection.objects.create(
        # Basic details
        commodity=commodity,
        date_of_inspection=inspection_date,
        start_of_inspection=f'{random.randint(7,11):02d}:{random.choice(["00","15","30","45"])}:00',
        end_of_inspection=f'{random.randint(12,17):02d}:{random.choice(["00","15","30","45"])}:00',

        # Inspector
        inspector_id=inspector_id,
        inspector_name=inspector_name,

        # Location
        inspection_location_type_id=random.randint(1, 5),
        latitude=f'-{random.uniform(25.5, 26.5):.6f}',
        longitude=f'{random.uniform(27.5, 28.5):.6f}',
        town=random.choice(towns),

        # Client
        client=client,
        client_name=client.name,
        internal_account_code=client.internal_account_code,

        # Product
        product_name=random.choice(product_names),
        product_class=random.choice(product_classes),

        # Sample info
        is_sample_taken=random.choice([True, True, True, False]),
        bought_sample=Decimal(str(random.randint(50, 500))) if random.random() > 0.3 else None,
        inspection_travel_distance_km=Decimal(str(random.randint(5, 150))),
        km_traveled=Decimal(str(random.randint(10, 200))),
        hours=Decimal(str(random.uniform(2, 8))).quantize(Decimal('0.01')),

        # Status
        approved_status=random.choice(['PENDING', 'PENDING', 'APPROVED']),
        is_direction_present_for_this_inspection=random.choice([True, False]),

        # Lab
        lab=random.choice(labs),

        # Testing flags
        fat=random.choice([True, False]),
        protein=random.choice([True, False]),
        calcium=random.choice([True, False]),
        dna=random.choice([True, False]),

        # Documentation
        inspected=True,
        follow_up=random.choice([True, False, False, False]),
        occurrence_report=random.choice([True, False, False, False]),
        dispensation_application=random.choice([True, False, False, False, False]),
        needs_retest=random.choice(['YES', 'NO', 'NO', 'NO']),

        # Email
        additional_email=f'inspector{i+1}@foodsafety.co.za',

        # Comments
        comment=f'Routine inspection #{i+1}. All procedures followed.' if random.random() > 0.5 else None,

        # Remote ID (simulating server data)
        remote_id=8000 + i,

        # Manual flag
        is_manual=True,
    )

    print(f"  Created inspection #{i+1}: {inspector_name} - {client.name} - {inspection_date}")

print("\n" + "="*50)
print("DONE!")
print("="*50)
print(f"\nAdmin User:")
print(f"  Username: admin")
print(f"  Password: admin123")
print(f"  Role: developer")
print(f"\nInspections created: 60")
print(f"Clients created: {len(client_names)}")
