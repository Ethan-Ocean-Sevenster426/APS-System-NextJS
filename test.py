import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()

def create_inspector_mapping():
    """Create InspectorMapping for test_inspector"""
    from main.models import InspectorMapping

    try:
        inspector = User.objects.get(username='test_inspector')
    except User.DoesNotExist:
        print("test_inspector user not found!")
        return

    # Create or update the inspector mapping
    mapping, created = InspectorMapping.objects.update_or_create(
        inspector_name=inspector.username,
        defaults={
            'inspector_id': str(inspector.id),
        }
    )

    if created:
        print(f"Created InspectorMapping: {mapping.inspector_name} -> {mapping.inspector_id}")
    else:
        print(f"Updated InspectorMapping: {mapping.inspector_name} -> {mapping.inspector_id}")

    return mapping

def create_test_inspections():
    """Create test inspections for the test_inspector user"""
    from main.models import FoodSafetyAgencyInspection

    # Get the test_inspector user
    try:
        inspector = User.objects.get(username='test_inspector')
    except User.DoesNotExist:
        print("test_inspector user not found! Run the account creation first.")
        return

    print(f"Creating inspections for: {inspector.username}")
    print("=" * 60)

    # Sample data for inspections
    clients = [
        {"name": "Pick n Pay Sandton", "code": "PNP001", "town": "Sandton", "email": "sandton@pnp.co.za", "group": "Pick n Pay - Corporate"},
        {"name": "Checkers Rosebank", "code": "CHK002", "town": "Rosebank", "email": "rosebank@checkers.co.za", "group": "Checkers"},
        {"name": "Spar Midrand", "code": "SPR003", "town": "Midrand", "email": "midrand@spar.co.za", "group": "Spar"},
        {"name": "Woolworths Fourways", "code": "WW004", "town": "Fourways", "email": "fourways@woolworths.co.za", "group": "Woolworths"},
        {"name": "Food Lovers Centurion", "code": "FLM005", "town": "Centurion", "email": "centurion@flm.co.za", "group": "Food Lovers Market"},
        {"name": "Shoprite Pretoria", "code": "SHP006", "town": "Pretoria", "email": "pretoria@shoprite.co.za", "group": "Shoprite"},
        {"name": "Boxer Soweto", "code": "BOX007", "town": "Soweto", "email": "soweto@boxer.co.za", "group": "Boxer"},
        {"name": "OK Foods Benoni", "code": "OKF008", "town": "Benoni", "email": "benoni@okfoods.co.za", "group": "OK Foods"},
    ]

    commodities = ["POULTRY", "RAW MEAT", "PMP", "EGGS"]
    facility_types = ["Retailer", "Re-Packer", "Processor", "Wholesaler"]
    group_types = ["Corporate Store", "Franchise Store", "Individual / Independent Owner"]

    created_count = 0

    for i, client in enumerate(clients):
        # Create inspection for each client
        date = timezone.now().date() - timedelta(days=random.randint(0, 30))
        commodity = random.choice(commodities)

        inspection = FoodSafetyAgencyInspection.objects.create(
            date_of_inspection=date,
            client_name=client["name"],
            internal_account_code=client["code"],
            town=client["town"],
            additional_email=client["email"],
            corporate_group=client["group"],
            group_type=random.choice(group_types),
            facility_type=random.choice(facility_types),
            commodity=commodity,
            inspector_name=inspector.username,
            inspector_id=str(inspector.id),
            is_manual=True,
            is_sample_taken=random.choice([True, False]),
            is_direction_present_for_this_inspection=random.choice([True, False, False, False]),
        )

        created_count += 1
        status = "Non-Compliant" if inspection.is_direction_present_for_this_inspection else "Compliant"
        print(f"Created: {client['name']} - {commodity} - {date} ({status})")

    print("=" * 60)
    print(f"\nCreated {created_count} inspections for test_inspector")
    print("Login with: test_inspector / Test123!")

if __name__ == '__main__':
    # First create the inspector mapping
    print("Step 1: Creating InspectorMapping...")
    create_inspector_mapping()
    print()

    # Then create the inspections
    print("Step 2: Creating test inspections...")
    create_test_inspections()
