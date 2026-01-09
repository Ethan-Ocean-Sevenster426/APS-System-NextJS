#!/usr/bin/env python3
import os
import sys
import json
import datetime

# Ensure project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
import django

django.setup()

from django.conf import settings
from main.services.onedrive_direct_service import OneDriveDirectUploadService
import requests


def main() -> int:
    svc = OneDriveDirectUploadService()
    print('Authenticating with OneDrive...')
    if not svc.authenticate_onedrive():
        print('AUTH_FAIL: OneDrive authentication required. Re-authenticate in Settings.')
        return 2

    today = datetime.date.today()
    year = today.strftime('%Y')
    month = today.strftime('%B')
    client_name = 'E2E_Test_Client'
    commodity = 'POULTRY'

    base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
    base_client = f"{base}/inspection/{year}/{month}/{client_name}"

    # Ensure structure
    print('Creating folder structure...')
    svc.create_onedrive_folder(f"{base_client}/Compliance/{commodity}")
    svc.create_onedrive_folder(f"{base_client}/rfi")
    svc.create_onedrive_folder(f"{base_client}/invoice")

    # Minimal PDF bytes
    pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"

    print('Uploading test files...')
    ok_comp = svc.upload_to_onedrive_direct(pdf_bytes, f"{base_client}/Compliance/{commodity}/test_compliance.pdf")
    ok_rfi = svc.upload_to_onedrive_direct(pdf_bytes, f"{base_client}/rfi/test_rfi.pdf")
    ok_inv = svc.upload_to_onedrive_direct(pdf_bytes, f"{base_client}/invoice/test_invoice.pdf")

    headers = {'Authorization': f'Bearer {svc.access_token}'}

    def exists(path: str) -> bool:
        url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{path}"
        r = requests.get(url, headers=headers)
        return r.status_code == 200

    v_comp = exists(f"{base_client}/Compliance/{commodity}/test_compliance.pdf")
    v_rfi = exists(f"{base_client}/rfi/test_rfi.pdf")
    v_inv = exists(f"{base_client}/invoice/test_invoice.pdf")

    result = {
        'uploaded': {'compliance': ok_comp, 'rfi': ok_rfi, 'invoice': ok_inv},
        'verified': {'compliance': v_comp, 'rfi': v_rfi, 'invoice': v_inv},
        'paths': {
            'compliance': f"{base_client}/Compliance/{commodity}/test_compliance.pdf",
            'rfi': f"{base_client}/rfi/test_rfi.pdf",
            'invoice': f"{base_client}/invoice/test_invoice.pdf",
        },
    }
    print(json.dumps(result, indent=2))

    return 0 if all([ok_comp, ok_rfi, ok_inv, v_comp, v_rfi, v_inv]) else 1


if __name__ == '__main__':
    sys.exit(main())
