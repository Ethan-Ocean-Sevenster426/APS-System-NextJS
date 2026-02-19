"""
Test script to send a dummy email with attachments via Microsoft Graph API.
Sends to ethansevenster5@gmail.com
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.core.mail import EmailMessage
from django.conf import settings

# Create a dummy PDF file for testing
dummy_pdf_path = '/tmp/test_inspection_report.pdf'
with open(dummy_pdf_path, 'wb') as f:
    f.write(b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    f.write(b'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
    f.write(b'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n')
    f.write(b'xref\n0 4\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n')

dummy_txt_path = '/tmp/test_inspection_notes.txt'
with open(dummy_txt_path, 'w') as f:
    f.write('Test inspection notes\nClient: Test Email Client\nDate: 2026-02-19\n')

print(f"Email backend: {settings.EMAIL_BACKEND}")
print(f"From email: {settings.DEFAULT_FROM_EMAIL}")
print(f"Graph Client ID: {settings.GRAPH_CLIENT_ID[:8]}..." if settings.GRAPH_CLIENT_ID else "Graph Client ID: NOT SET")
print(f"Graph Tenant ID: {settings.GRAPH_TENANT_ID[:8]}..." if settings.GRAPH_TENANT_ID else "Graph Tenant ID: NOT SET")
print()

recipient = 'ethansevenster5@gmail.com'
print(f"Sending test email to {recipient}...")

email = EmailMessage(
    subject='Test Inspection Documents - Food Safety Agency',
    body='This is a test email from the Inspection System.\n\nAttached are dummy inspection documents for testing.',
    from_email=settings.DEFAULT_FROM_EMAIL,
    to=[recipient],
)

email.attach_file(dummy_pdf_path)
email.attach_file(dummy_txt_path)

try:
    result = email.send()
    print(f"Result: {result}")
    if result:
        print("SUCCESS - Email sent! Check ethansevenster5@gmail.com")
    else:
        print("FAILED - email.send() returned 0")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

os.remove(dummy_pdf_path)
os.remove(dummy_txt_path)
