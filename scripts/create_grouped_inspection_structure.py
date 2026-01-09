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

def create_grouped(client_name: str, date_str: str, inspection_ids: list[str]) -> bool:
    svc = OneDriveDirectUploadService()
    if not svc.authenticate_onedrive():
        print('AUTH_FAIL: Re-authenticate in Settings first.')
        return False

    dt = datetime.datetime.strptime(date_str, '%m/%d/%y').date()
    year = dt.strftime('%Y')
    month = dt.strftime('%B')

    base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
    base_client = f"{base}/inspection/{year}/{month}/{client_name}"

    # Create per-inspection folders with standard subfolders
    subfolders = ['compliance', 'rfi', 'invoice', 'form', 'lab', 'retest']
    created = 0
    for insp_id in inspection_ids:
        insp_folder = f"{base_client}/inspection-{insp_id}"
        ok = svc.create_onedrive_folder(insp_folder)
        for sub in subfolders:
            svc.create_onedrive_folder(f"{insp_folder}/{sub}")
        if ok:
            created += 1
        print(f"✅ Ensured structure: {insp_folder}/({' '.join(subfolders)})")

    # Ensure top-level grouped buckets (unmatched grouped docs)
    for sub in ['rfi', 'invoice', 'compliance']:
        svc.create_onedrive_folder(f"{base_client}/{sub}")

    print(f"Done. Created/ensured {created} inspection folders under {base_client}")
    return True

if __name__ == '__main__':
    # Defaults from the user request
    client = 'Big Save - Hammanskraal'
    date_str = '09/22/25'
    ids = ['16492','7776','5615','8810','8811','8812','8813']
    ok = create_grouped(client, date_str, ids)
    sys.exit(0 if ok else 1)
