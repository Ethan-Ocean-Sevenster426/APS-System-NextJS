#!/usr/bin/env python3
import os
import sys
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

import django
django.setup()

from django.conf import settings
from main.services.onedrive_direct_service import OneDriveDirectUploadService
import requests

CLIENT = 'Big Save - Hammanskraal'
DATE_STR = '09/22/25'
IDS = ['16492','7776','5615','8810','8811','8812','8813']


def delete_onedrive_path(access_token: str, path: str):
    url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{path}"
    headers = {'Authorization': f'Bearer {access_token}'}
    # Get item id
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        item_id = r.json().get('id')
        if item_id:
            del_url = f"https://graph.microsoft.com/v1.0/me/drive/items/{item_id}"
            requests.delete(del_url, headers=headers)


def main() -> int:
    svc = OneDriveDirectUploadService()
    if not svc.authenticate_onedrive():
        print('AUTH_FAIL: Re-authenticate in Settings.')
        return 2

    dt = datetime.datetime.strptime(DATE_STR, '%m/%d/%y').date()
    year = dt.strftime('%Y')
    month = dt.strftime('%B')

    base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
    base_client = f"{base}/inspection/{year}/{month}/{CLIENT}"

    # 1) Delete existing test structure in OneDrive
    # Delete per-inspection folders
    for insp_id in IDS:
        delete_onedrive_path(svc.access_token, f"{base_client}/inspection-{insp_id}")
    # Delete top-level grouped buckets
    for sub in ['rfi','invoice','compliance']:
        delete_onedrive_path(svc.access_token, f"{base_client}/{sub}")

    # 2) Delete local structure
    local_base = os.path.join(settings.MEDIA_ROOT, 'inspection', year, month, CLIENT)
    if os.path.exists(local_base):
        import shutil
        shutil.rmtree(local_base, ignore_errors=True)

    # 3) Recreate per-inspection structure
    from scripts.create_grouped_inspection_structure import create_grouped
    ok = create_grouped(CLIENT, DATE_STR, IDS)
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
