"""
Reset all inspections to not-sent status for testing.
Run on server: cd /var/inspection-system && source venv/bin/activate && python3 reset_sent.py
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from main.models import FoodSafetyAgencyInspection

sent = FoodSafetyAgencyInspection.objects.filter(is_sent=True)
count = sent.count()
print(f"Found {count} inspections marked as sent.")

if count > 0:
    sent.update(is_sent=False, sent_date=None, sent_by=None)
    print(f"Reset {count} inspections to not-sent.")
else:
    print("Nothing to reset.")
