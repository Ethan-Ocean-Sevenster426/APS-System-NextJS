#!/usr/bin/env python
"""Delete Test Inspector user and their inspections from the database."""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection, InspectorMapping
from django.contrib.auth import get_user_model
User = get_user_model()

# --- Preview ---
inspections = FoodSafetyAgencyInspection.objects.filter(inspector_id=9003, inspector_name="Test Inspector")
user = User.objects.filter(username='testuser').first()
mapping = InspectorMapping.objects.filter(inspector_id=9003).first()

print(f"Inspections to delete: {inspections.count()}")
print(f"User to delete: {user}")
print(f"InspectorMapping to delete: {mapping}")

if '--confirm' not in sys.argv:
    print("\nDry run. Pass --confirm to actually delete.")
    sys.exit(0)

# --- Delete ---
deleted_insp, _ = inspections.delete()
print(f"Deleted {deleted_insp} inspections.")

if mapping:
    mapping.delete()
    print("Deleted InspectorMapping.")

if user:
    try:
        user.delete()
        print("Deleted user 'testuser'.")
    except Exception as e:
        # Fallback: deactivate if delete fails (e.g. missing migration table)
        user.is_active = False
        user.save()
        print(f"Could not delete user (DB issue: {e.__class__.__name__}), deactivated instead.")

print("Done.")
