"""
Script to populate the database with test inspection data.
Run with: python manage.py shell < populate_test_inspections.py
Or: python populate_test_inspections.py (with Django settings configured)
"""
import os
import sys
import random
from datetime import datetime, timedelta, time
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
import django
django.setup()

from main.models import FoodSafetyAgencyInspection

# Sample data for generating realistic inspections
CLIENTS = [
    ("Pick n Pay Sandton", "Sandton"),
    ("Checkers Rosebank", "Rosebank"),
    ("Woolworths Fourways", "Fourways"),
    ("Spar Midrand", "Midrand"),
    ("Food Lovers Centurion", "Centurion"),
    ("Shoprite Pretoria", "Pretoria"),
    ("Game Menlyn", "Menlyn"),
    ("Makro Silverlakes", "Silverlakes"),
    ("Metro Cash & Carry", "Johannesburg"),
    ("Boxers Soweto", "Soweto"),
    ("OK Foods Germiston", "Germiston"),
    ("Cambridge Food Benoni", "Benoni"),
    ("Superspar Bryanston", "Bryanston"),
    ("Checkers Hyper Boksburg", "Boksburg"),
    ("Pick n Pay Hypermarket Norwood", "Norwood"),
    ("Woolworths Melrose Arch", "Melrose"),
    ("Food Lovers Market Kyalami", "Kyalami"),
    ("Spar Lonehill", "Lonehill"),
    ("Checkers Bedfordview", "Bedfordview"),
    ("Pick n Pay Cresta", "Cresta"),
    ("Woolworths Clearwater", "Clearwater"),
    ("Shoprite Roodepoort", "Roodepoort"),
    ("Game Eastgate", "Eastgate"),
    ("Makro Strubens Valley", "Strubens Valley"),
    ("OK Grocer Randburg", "Randburg"),
]

INSPECTORS = [
    ("Aman Singh", 101),
    ("Test Inspector", 102),
    ("John Mokoena", 103),
    ("Sarah van der Berg", 104),
    ("Thabo Nkosi", 105),
    ("Maria Pretorius", 106),
    ("David Botha", 107),
    ("Nomsa Dlamini", 108),
]

COMMODITIES = ['RAW', 'PMP', 'POULTRY', 'EGGS']
LABS = ['lab_a', 'lab_b', 'lab_c', 'lab_d', 'lab_e', 'lab_f']

PRODUCTS_RAW = [
    ("Beef Mince", "Minced Meat"),
    ("Beef Steak", "Whole Cut"),
    ("Lamb Chops", "Whole Cut"),
    ("Pork Ribs", "Whole Cut"),
    ("Beef Brisket", "Whole Cut"),
    ("Lamb Leg", "Whole Cut"),
    ("Pork Loin", "Whole Cut"),
    ("Beef Fillet", "Premium Cut"),
]

PRODUCTS_PMP = [
    ("Boerewors", "Processed Sausage"),
    ("Polony", "Processed Cold Meat"),
    ("Viennas", "Processed Sausage"),
    ("Bacon", "Cured Meat"),
    ("Ham", "Cured Meat"),
    ("Burger Patties", "Processed Patty"),
    ("Sausage Rolls", "Processed Pastry"),
    ("Chicken Nuggets", "Processed Coated"),
]

PRODUCTS_POULTRY = [
    ("Chicken Breast", "Whole Cut"),
    ("Chicken Thighs", "Whole Cut"),
    ("Whole Chicken", "Whole Bird"),
    ("Chicken Wings", "Portions"),
    ("Turkey Breast", "Whole Cut"),
    ("Duck Portions", "Portions"),
]

PRODUCTS_EGGS = [
    ("Large Eggs", "Shell Eggs"),
    ("Medium Eggs", "Shell Eggs"),
    ("Free Range Eggs", "Shell Eggs"),
    ("Organic Eggs", "Shell Eggs"),
    ("Liquid Egg", "Processed Egg"),
]

CORPORATE_GROUPS = ['Pick n Pay', 'Checkers', 'Woolworths', 'Spar', 'Shoprite', 'Game', 'Makro', 'Independent']
GROUP_TYPES = ['Corporate Store', 'Franchise Store', 'Individual']
FACILITY_TYPES = ['Retailer', 'Butchery', 'Re-Packer', 'Processor', 'Distributor']

OCCURRENCE_FINDINGS = [
    "Temperature deviation in cold storage",
    "Expired product found on shelf",
    "Inadequate pest control measures",
    "Cross-contamination risk identified",
    "Improper food handling practices",
    "Labeling non-compliance",
    "Hygiene standards not met",
    "Equipment maintenance required",
    "Staff training needed",
    "Documentation incomplete",
]

def random_date(start_days_ago=90, end_days_ago=1):
    """Generate a random date between start_days_ago and end_days_ago"""
    start = datetime.now() - timedelta(days=start_days_ago)
    end = datetime.now() - timedelta(days=end_days_ago)
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).date()

def random_time():
    """Generate a random time between 7am and 5pm"""
    hour = random.randint(7, 17)
    minute = random.choice([0, 15, 30, 45])
    return time(hour, minute)

def get_products_for_commodity(commodity):
    """Get appropriate products for a commodity type"""
    if commodity == 'RAW':
        return random.choice(PRODUCTS_RAW)
    elif commodity == 'PMP':
        return random.choice(PRODUCTS_PMP)
    elif commodity == 'POULTRY':
        return random.choice(PRODUCTS_POULTRY)
    elif commodity == 'EGGS':
        return random.choice(PRODUCTS_EGGS)
    return ("Unknown Product", "Unknown Class")

def create_regular_inspection(index):
    """Create a single regular inspection with all fields filled"""
    client_name, town = random.choice(CLIENTS)
    inspector_name, inspector_id = random.choice(INSPECTORS)
    commodity = random.choice(COMMODITIES)
    product_name, product_class = get_products_for_commodity(commodity)
    inspection_date = random_date()
    start_time = random_time()
    end_hour = start_time.hour + random.randint(1, 3)
    end_time = time(min(end_hour, 17), random.choice([0, 15, 30, 45]))

    # Generate tests based on commodity
    fat = random.choice([True, False])
    protein = random.choice([True, False])
    calcium = commodity == 'PMP' and random.choice([True, False])
    dna = commodity == 'RAW' and random.choice([True, False])
    is_sample_taken = fat or protein or calcium or dna

    inspection = FoodSafetyAgencyInspection(
        # Basic details
        commodity=commodity,
        date_of_inspection=inspection_date,
        start_of_inspection=start_time,
        end_of_inspection=end_time,

        # Location
        inspection_location_type_id=random.randint(1, 5),
        is_direction_present_for_this_inspection=random.choice([True, False]),
        inspector_id=inspector_id,
        inspector_name=inspector_name,

        # GPS
        latitude=f"-{random.uniform(25.5, 26.5):.6f}",
        longitude=f"{random.uniform(27.5, 28.5):.6f}",

        # Product
        product_name=product_name,
        product_class=product_class,

        # Sample and travel
        is_sample_taken=is_sample_taken,
        bought_sample=Decimal(str(random.randint(50, 500))) if is_sample_taken else None,
        inspection_travel_distance_km=Decimal(str(random.randint(10, 150))),
        km_traveled=Decimal(str(random.randint(10, 150))),
        hours=Decimal(str(random.uniform(1, 8))).quantize(Decimal('0.01')),

        # Status
        approved_status=random.choice(['PENDING', 'APPROVED']),
        comment=f"Routine inspection #{index + 1}. All standards checked." if random.choice([True, False]) else None,
        lab=random.choice(LABS) if is_sample_taken else None,

        # Reference
        remote_id=10000 + index,
        client_name=client_name,
        internal_account_code=f"ACC{random.randint(1000, 9999)}",
        town=town,

        # Activities
        inspected=True,
        follow_up=random.choice([True, False, False, False]),  # 25% chance
        occurrence_report=random.choice([True, False, False, False, False]),  # 20% chance
        dispensation_application=random.choice([True, False, False, False, False, False]),  # ~17% chance

        # Tests
        fat=fat,
        protein=protein,
        calcium=calcium,
        dna=dna,
        needs_retest=random.choice(['YES', 'NO', None]),

        # Document status
        is_sent=random.choice([True, False]),

        # Invoice
        invoice_number=f"INV-{random.randint(10000, 99999)}" if random.choice([True, False, False]) else None,

        # Manual entry
        is_manual=True,

        # Classification
        corporate_group=random.choice(CORPORATE_GROUPS),
        group_type=random.choice(GROUP_TYPES),
        facility_type=random.choice(FACILITY_TYPES),

        # Not an occurrence report
        is_occurrence_report=False,
    )

    return inspection

def create_occurrence_report(index):
    """Create a single occurrence report with all fields filled"""
    client_name, town = random.choice(CLIENTS)
    inspector_name, inspector_id = random.choice(INSPECTORS)
    inspection_date = random_date()
    visit_time = random_time()

    # Select 2-5 random findings
    num_findings = random.randint(2, 5)
    findings = random.sample(OCCURRENCE_FINDINGS, num_findings)

    inspection = FoodSafetyAgencyInspection(
        # Basic details
        commodity='RAW',  # Occurrence reports typically for RAW
        date_of_inspection=inspection_date,
        start_of_inspection=visit_time,
        end_of_inspection=time(min(visit_time.hour + 2, 17), visit_time.minute),

        # Location
        inspection_location_type_id=random.randint(1, 5),
        is_direction_present_for_this_inspection=True,
        inspector_id=inspector_id,
        inspector_name=inspector_name,

        # GPS
        latitude=f"-{random.uniform(25.5, 26.5):.6f}",
        longitude=f"{random.uniform(27.5, 28.5):.6f}",

        # Product (may be general for occurrence)
        product_name="Various Products",
        product_class="Multiple Categories",

        # Travel
        km_traveled=Decimal(str(random.randint(10, 100))),
        hours=Decimal(str(random.uniform(2, 6))).quantize(Decimal('0.01')),

        # Status
        approved_status='PENDING',
        comment="Occurrence report - requires follow-up action",

        # Reference
        remote_id=20000 + index,
        client_name=client_name,
        internal_account_code=f"OCC{random.randint(1000, 9999)}",
        town=town,

        # Activities
        inspected=True,
        follow_up=True,
        occurrence_report=True,

        # Manual entry
        is_manual=True,

        # Classification
        corporate_group=random.choice(CORPORATE_GROUPS),
        group_type=random.choice(GROUP_TYPES),
        facility_type=random.choice(FACILITY_TYPES),

        # OCCURRENCE REPORT SPECIFIC FIELDS
        is_occurrence_report=True,
        registration_code=f"REG-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
        physical_address=f"{random.randint(1, 999)} {random.choice(['Main', 'Church', 'Oak', 'Park', 'Station'])} Street, {town}, Gauteng, South Africa",
        telephone=f"0{random.randint(11, 87)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
        time_of_visit=visit_time,
        occurrence_findings=findings,
        occurrence_description=f"During the inspection on {inspection_date.strftime('%d/%m/%Y')}, the following issues were identified: {'; '.join(findings)}. Immediate corrective action is required. The facility manager was notified and a follow-up inspection will be scheduled within 14 days.",
        occurrence_inspector_name=inspector_name,
        occurrence_inspector_date=inspection_date,
        occurrence_manager_name=f"{random.choice(['Mr.', 'Mrs.', 'Ms.'])} {random.choice(['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Naidoo', 'Pillay', 'Van Wyk'])}",
        occurrence_manager_date=inspection_date,
    )

    return inspection

def main():
    print("=" * 60)
    print("POPULATING DATABASE WITH TEST INSPECTIONS")
    print("=" * 60)

    # Create 200 regular inspections
    print("\nCreating 200 regular inspections...")
    regular_inspections = []
    for i in range(200):
        inspection = create_regular_inspection(i)
        regular_inspections.append(inspection)
        if (i + 1) % 50 == 0:
            print(f"  Created {i + 1} inspections...")

    # Bulk create regular inspections
    FoodSafetyAgencyInspection.objects.bulk_create(regular_inspections)
    print(f"  ✓ Successfully created 200 regular inspections")

    # Create 30 occurrence reports
    print("\nCreating 30 occurrence reports...")
    occurrence_reports = []
    for i in range(30):
        report = create_occurrence_report(i)
        occurrence_reports.append(report)
        if (i + 1) % 10 == 0:
            print(f"  Created {i + 1} occurrence reports...")

    # Bulk create occurrence reports
    FoodSafetyAgencyInspection.objects.bulk_create(occurrence_reports)
    print(f"  ✓ Successfully created 30 occurrence reports")

    # Summary
    total_inspections = FoodSafetyAgencyInspection.objects.count()
    total_occurrence = FoodSafetyAgencyInspection.objects.filter(is_occurrence_report=True).count()
    total_regular = FoodSafetyAgencyInspection.objects.filter(is_occurrence_report=False).count()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total inspections in database: {total_inspections}")
    print(f"  - Regular inspections: {total_regular}")
    print(f"  - Occurrence reports: {total_occurrence}")
    print("=" * 60)

if __name__ == '__main__':
    main()
