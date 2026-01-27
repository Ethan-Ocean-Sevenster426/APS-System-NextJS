#!/usr/bin/env python3
"""
Add clients with all fields using bulk_create
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client
from django.utils import timezone

print("\n" + "="*80)
print("ADD CLIENTS - BULK IMPORT")
print("="*80)

# Read the file
with open('All Clients.txt.', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"\nFound {len(lines)} lines in file")
print("Preparing client data...")

# Collect all clients to bulk create
clients_to_create = []
skipped_count = 0
seen_names = set()

for line_num, line in enumerate(lines, start=1):
    try:
        # Split by tab
        parts = line.strip().split('\t')

        if len(parts) < 11:
            skipped_count += 1
            continue

        # Extract fields
        facility_type = parts[1].strip() if len(parts) > 1 else ''
        group_type = parts[2].strip() if len(parts) > 2 else ''
        town = parts[4].strip() if len(parts) > 4 and parts[4].strip() != 'TBC' else ''
        corporate_group = parts[5].strip() if len(parts) > 5 else ''
        client_name = parts[10].strip() if len(parts) > 10 else ''
        email = parts[11].strip() if len(parts) > 11 else ''
        phone_number = parts[12].strip() if len(parts) > 12 else ''

        # Skip if client name is empty
        if not client_name:
            skipped_count += 1
            continue

        # Skip duplicates within the file
        if client_name.lower() in seen_names:
            skipped_count += 1
            continue

        seen_names.add(client_name.lower())

        # Clean corporate group
        if corporate_group == 'Not Applicable (None)':
            corporate_group = ''

        # Create client object (don't save yet)
        now = timezone.now()
        client = Client(
            name=client_name,
            town=town,
            corporate_group=corporate_group,
            facility_type=facility_type,
            group_type=group_type,
            email=email if email else None,
            created_at=now,
            updated_at=now
        )
        clients_to_create.append(client)

    except Exception as e:
        print(f"Line {line_num}: Error - {str(e)}")
        skipped_count += 1

print(f"\n✅ Prepared {len(clients_to_create)} unique clients")
print(f"⏭️  Skipped: {skipped_count} (empty or duplicate)")
print("\nGenerating client IDs...")

# Generate client_id for each client (CL00001, CL00002, etc.)
for idx, client in enumerate(clients_to_create, start=1):
    client.client_id = f"CL{idx:05d}"

print(f"✅ Generated {len(clients_to_create)} client IDs")
print("\nBulk creating clients...")

# Bulk create all clients at once
if clients_to_create:
    Client.objects.bulk_create(clients_to_create, batch_size=500)
    print(f"✅ Bulk insert complete!")

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"✅ Created: {len(clients_to_create)} clients")
print(f"⏭️  Skipped: {skipped_count} (empty or duplicate)")
print(f"📊 Total in database: {Client.objects.count()}")
print("="*80 + "\n")
