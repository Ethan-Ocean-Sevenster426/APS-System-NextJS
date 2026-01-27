#!/usr/bin/env python3
"""
Delete ALL clients from database
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection

print("\n" + "="*80)
print("DELETE ALL CLIENTS")
print("="*80)

with connection.cursor() as cursor:
    # Disable foreign key checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0')

    # Delete all clients
    cursor.execute('DELETE FROM food_safety_agency_clients')
    deleted = cursor.rowcount
    print(f"\n✅ Deleted {deleted} clients")

    # Reset auto-increment
    cursor.execute('ALTER TABLE food_safety_agency_clients AUTO_INCREMENT = 1')
    print("✅ Reset auto-increment to 1")

    # Re-enable foreign key checks
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1')

    # Verify
    cursor.execute('SELECT COUNT(*) FROM food_safety_agency_clients')
    count = cursor.fetchone()[0]
    print(f"\nFinal count: {count}")

    if count == 0:
        print("\n" + "="*80)
        print("✅ DATABASE IS EMPTY - READY TO IMPORT")
        print("="*80)
        print("\nRun: python import_all_clients.py")
        print("="*80 + "\n")
    else:
        print(f"\n❌ ERROR: Still {count} clients in database!")
