#!/usr/bin/env python
"""
Delete ALL data and start completely fresh
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, Client

print("\n" + "="*80)
print("DELETE ALL DATA")
print("="*80)

# Delete all inspections
print("\nDeleting all inspections...")
inspection_count = FoodSafetyAgencyInspection.objects.count()
FoodSafetyAgencyInspection.objects.all().delete()
print(f"✓ Deleted {inspection_count} inspections")

# Delete all clients
print("\nDeleting all clients...")
client_count = Client.objects.count()
Client.objects.all().delete()
print(f"✓ Deleted {client_count} clients")

print("\n" + "="*80)
print("✅ ALL DATA DELETED")
print("="*80)
print(f"\nDeleted {inspection_count} inspections")
print(f"Deleted {client_count} clients")
print("\nDatabase is now completely clean and ready for fresh data.")
print("="*80)
