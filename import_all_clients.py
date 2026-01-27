#!/usr/bin/env python3
"""
Import all clients from All Clients.txt file
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client

print("\n" + "="*80)
print("IMPORT ALL CLIENTS FROM FILE")
print("="*80)

# Read the file
with open('All Clients.txt.', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"\nFound {len(lines)} lines in file")

# Collect all clients to create
clients_to_create = []
skipped_count = 0
error_count = 0

for line_num, line in enumerate(lines, start=1):
    try:
        # Split by tab
        parts = line.strip().split('\t')

        if len(parts) < 11:
            skipped_count += 1
            continue

        facility_type = parts[1].strip()
        group_type = parts[2].strip()
        town = parts[4].strip() if parts[4].strip() != 'TBC' else ''
        corporate_group = parts[5].strip()
        client_name = parts[10].strip()

        # Skip if client name is empty
        if not client_name:
            skipped_count += 1
            continue

        # Skip if already in our list to create
        if any(c.name.lower() == client_name.lower() for c in clients_to_create):
            skipped_count += 1
            continue

        # Create client object (will auto-generate client_id on save)
        client = Client(
            name=client_name,
            town=town,
            corporate_group=corporate_group if corporate_group != 'Not Applicable (None)' else '',
            facility_type=facility_type,
            group_type=group_type
        )
        clients_to_create.append(client)

    except Exception as e:
        print(f"Line {line_num}: Error - {str(e)}")
        error_count += 1

print(f"\nPrepared {len(clients_to_create)} unique clients to import")
print("Starting import...\n")

# Import clients one by one with progress tracking
created_count = 0
for idx, client in enumerate(clients_to_create, start=1):
    try:
        client.save()
        created_count += 1

        if created_count % 100 == 0:
            print(f"✅ Added {created_count} clients out of {len(clients_to_create)}...")

    except Exception as e:
        print(f"Error creating {client.name}: {str(e)}")
        error_count += 1

print("\n" + "="*80)
print("SUMMARY")
print("="*80)
print(f"✅ Created: {created_count} new clients")
print(f"⏭️  Skipped: {skipped_count} clients (empty or duplicate)")
print(f"❌ Errors: {error_count}")
print(f"📊 Total clients in database: {Client.objects.count()}")
print("="*80 + "\n")
