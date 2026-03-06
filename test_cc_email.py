"""
Test script to verify CC functionality: sends to client, CC inspector + manager.
Run on server: cd /var/www/v4-Worksheet-demo && source venv/bin/activate && python test_cc_email.py
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
YELLOW = '\033[93m'
RESET = '\033[0m'

# Simulate the send flow with CC
client_email = 'anthony.penzes@moc-pty.com'  # Simulated client (your email for testing)
manager_email = 'simphiwe.mathenjwa@afsq.co.za'
inspector_email = 'ethan.sevenster@eclick.co.za'  # Simulated inspector

to_list = [client_email, manager_email]
cc_list = [inspector_email]

print(f"\n{'='*60}")
print(f" TEST: Send email with manager as TO + inspector as CC")
print(f"{'='*60}")
print(f"  {CYAN}EMAIL_BACKEND:{RESET} {settings.EMAIL_BACKEND}")
print(f"  {CYAN}DEFAULT_FROM_EMAIL:{RESET} {getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')}")
print(f"  {CYAN}TO (client):{RESET} {client_email}")
print(f"  {CYAN}TO (manager):{RESET} {manager_email}")
print(f"  {CYAN}CC (inspector):{RESET} {inspector_email}")

html_body = """
<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #333;">
    <p>Good day,</p>
    <p>This is a <strong>CC test email</strong> from the FSA Inspection System.</p>
    <p>This email tests the new CC functionality:</p>
    <ul>
        <li><strong>TO:</strong> Client email</li>
        <li><strong>CC:</strong> Manager (simphiwe.mathenjwa@afsq.co.za)</li>
        <li><strong>CC:</strong> Inspector who performed the inspection</li>
    </ul>
    <p>If all three recipients received this email, the CC flow is working correctly.</p>
    <p>Kind Regards,<br>FSA System Test</p>
</div>
"""

try:
    email = EmailMessage(
        subject='FSA Test v3 - Manager as TO recipient',
        body=html_body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'foodsafetyagency.aps@afsq.co.za'),
        to=to_list,
        cc=cc_list,
        reply_to=[getattr(settings, 'DEFAULT_FROM_EMAIL', 'foodsafetyagency.aps@afsq.co.za')],
    )
    email.content_subtype = 'html'

    print(f"\n  {CYAN}email.to:{RESET} {email.to}")
    print(f"  {CYAN}email.cc:{RESET} {email.cc}")
    print(f"\n  Sending email...")
    result = email.send()

    if result:
        print(f"  {GREEN}SUCCESS{RESET} Email sent! (result={result})")
        print(f"\n  {YELLOW}Check inboxes:{RESET}")
        print(f"    - {client_email} (TO)")
        print(f"    - {manager_email} (TO)")
        print(f"    - {inspector_email} (CC)")
    else:
        print(f"  {RED}FAILED{RESET} email.send() returned {result}")

except Exception as e:
    import traceback
    print(f"  {RED}ERROR{RESET} {e}")
    traceback.print_exc()

print(f"\n{'='*60}\n")
