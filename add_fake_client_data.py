"""
Script to add fake emails and account codes to clients for testing.
Run with: python manage.py shell < add_fake_client_data.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client
import random

# Fake data
fake_emails = [
    'john.smith@example.com',
    'jane.doe@testmail.com',
    'info@meatprocessing.co.za',
    'quality@freshfoods.com',
    'admin@butchery.co.za',
    'contact@farmproducts.com',
    'sales@meatworks.co.za',
    'inspection@foodsafety.com',
    'manager@qualitymeats.co.za',
    'office@premiumcuts.com',
]

fake_account_codes = [
    'ACC-001-PMP',
    'ACC-002-RAW',
    'ACC-003-PMP',
    'ACC-004-RAW',
    'ACC-005-PMP',
    'ACC-006-RAW',
    'ACC-007-PMP',
    'ACC-008-RAW',
    'ACC-009-PMP',
    'ACC-010-RAW',
]

# Get all clients
clients = Client.objects.all()
print(f"Found {clients.count()} clients")

updated = 0
for i, client in enumerate(clients):
    # Only update if email or account code is missing
    changed = False

    if not client.email:
        client.email = fake_emails[i % len(fake_emails)]
        changed = True

    if not client.internal_account_code:
        client.internal_account_code = fake_account_codes[i % len(fake_account_codes)]
        changed = True

    if changed:
        client.save()
        updated += 1
        print(f"Updated: {client.client_id} -> Email: {client.email}, Code: {client.internal_account_code}")

print(f"\nDone! Updated {updated} clients.")
