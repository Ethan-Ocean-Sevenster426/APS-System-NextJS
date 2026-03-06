"""
Test script to verify the Send button email flow works end-to-end.
Sends a test email to ethan.sevenster@eclick.co.za via Graph API.

Run on server: cd /var/inspection-system && source venv/bin/activate && python3 test_send_email.py
"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from django.conf import settings
from django.core.mail import EmailMessage

GREEN = '\033[92m'
RED = '\033[91m'
CYAN = '\033[96m'
RESET = '\033[0m'

recipient = 'ethan.sevenster@eclick.co.za'

print(f"\n{'='*60}")
print(f" TEST: Send email via Graph API to {recipient}")
print(f"{'='*60}")
print(f"  {CYAN}EMAIL_BACKEND:{RESET} {settings.EMAIL_BACKEND}")
print(f"  {CYAN}DEFAULT_FROM_EMAIL:{RESET} {getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')}")

html_body = """
<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Good day,</p>
    <p>This is a <strong>test email</strong> from the FSA Inspection System.</p>
    <p>If you received this, the Send button email flow is working correctly via Microsoft Graph API.</p>
    <p>Kind Regards,<br>FSA System Test</p>
</div>
"""

try:
    email = EmailMessage(
        subject='FSA Test - Send Button Email Flow Test',
        body=html_body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@eclick.co.za'),
        to=[recipient],
    )
    email.content_subtype = 'html'

    print(f"\n  Sending email to {recipient}...")
    result = email.send()

    if result:
        print(f"  {GREEN}SUCCESS{RESET} Email sent! (result={result})")
        print(f"  Check inbox at {recipient}")
    else:
        print(f"  {RED}FAILED{RESET} email.send() returned {result}")

except Exception as e:
    import traceback
    print(f"  {RED}ERROR{RESET} {e}")
    traceback.print_exc()

print(f"\n{'='*60}\n")
