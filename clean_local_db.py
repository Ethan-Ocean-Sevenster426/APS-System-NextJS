"""
Clean the LOCAL inspection_system DB on 167.88.43.168 (localhost).
This clears all app data tables so they can be repopulated fresh.

Run on the server: python manage.py shell < clean_local_db.py
Or: cd /var/www/v4-Worksheet-demo && python clean_local_db.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# Force localhost connection (the local DB with 874 inspections)
os.environ['DB_HOST'] = 'localhost'

django.setup()

from django.conf import settings

# Safety check - make sure we're hitting localhost, NOT the remote DB
db_host = settings.DATABASES['default']['HOST']
print(f"Connected to DB host: {db_host}")
print(f"DB name: {settings.DATABASES['default']['NAME']}")

if db_host not in ('localhost', '127.0.0.1', ''):
    print(f"ABORT: Not connected to localhost! Connected to {db_host}")
    print("This script only cleans the local DB. Exiting.")
    sys.exit(1)

from django.apps import apps

print("\n=== Cleaning local inspection_system DB ===\n")

# Delete in reverse dependency order to avoid FK issues
from django.db import connection

# Disable FK checks temporarily
with connection.cursor() as cursor:
    cursor.execute("SET session_replication_role = 'replica';")

deleted_total = 0
for model in apps.get_models():
    if model._meta.app_label in ('main',):
        count = model.objects.count()
        if count > 0:
            model.objects.all().delete()
            print(f"  Deleted {count} rows from {model._meta.db_table}")
            deleted_total += count
        else:
            print(f"  Skipped {model._meta.db_table} (empty)")

# Re-enable FK checks
with connection.cursor() as cursor:
    cursor.execute("SET session_replication_role = 'origin';")

print(f"\nDone. Deleted {deleted_total} total rows.")
