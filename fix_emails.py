"""
Fix typo in client emails: ethan.sevnester -> ethan.sevenster
Run: cd /var/inspection-system && source venv/bin/activate && python3 fix_emails.py
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from main.models import Client, ClientEmail

WRONG = 'ethan.sevnester@eclick.co.za'
RIGHT = 'ethan.sevenster@eclick.co.za'

print(f"\nFixing: {WRONG} -> {RIGHT}\n")

# Fix Client.email
count = Client.objects.filter(email__icontains='sevnester').count()
if count:
    Client.objects.filter(email__icontains='sevnester').update(
        email=RIGHT
    )
    print(f"  Fixed {count} Client.email records")
else:
    print(f"  No Client.email records with typo")

# Fix Client.manual_email
count = Client.objects.filter(manual_email__icontains='sevnester').count()
if count:
    Client.objects.filter(manual_email__icontains='sevnester').update(
        manual_email=RIGHT
    )
    print(f"  Fixed {count} Client.manual_email records")
else:
    print(f"  No Client.manual_email records with typo")

# Fix ClientEmail table
count = ClientEmail.objects.filter(email__icontains='sevnester').count()
if count:
    ClientEmail.objects.filter(email__icontains='sevnester').update(
        email=RIGHT
    )
    print(f"  Fixed {count} ClientEmail records")
else:
    print(f"  No ClientEmail records with typo")

# Verify
print(f"\nVerification:")
for c in Client.objects.filter(email__icontains='eclick'):
    print(f"  Client '{c.name}': email={c.email}, manual_email={c.manual_email}")
for ce in ClientEmail.objects.filter(email__icontains='eclick'):
    print(f"  ClientEmail: client={ce.client}, email={ce.email}")

print(f"\nDone!\n")
