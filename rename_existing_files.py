#!/usr/bin/env python3
"""
Bulk rename existing uploaded files to FSA-ClientName-Type-YYMMDD.ext format.
Run on server: python rename_existing_files.py [--dry-run]
"""
import os, sys, re, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import FoodSafetyAgencyInspection

DRY_RUN = '--dry-run' in sys.argv

MEDIA_ROOT = '/var/www/v4-Worksheet-demo/media'
DOCS_DIR = os.path.join(MEDIA_ROOT, 'docs')

TYPE_LABEL_MAP = {
    'rfi': 'RFI',
    'invoice': 'INV',
    'lab': 'COA',
    'lab_form': 'LAB',
    'retest': 'RETEST',
    'compliance': 'COMP',
    'composition': 'COMPOSITION',
    'occurrence': 'OCC',
    'other': 'OTHER',
    'coa': 'COA',
}

def clean_name(name):
    cleaned = re.sub(r'[^a-zA-Z0-9\s\-]', '', name)
    cleaned = cleaned.strip().replace(' ', '-')
    cleaned = re.sub(r'-+', '-', cleaned).strip('-')
    return cleaned or 'Unknown'

# Cache inspection lookups
inspection_cache = {}

def get_inspection(inspection_id):
    if inspection_id not in inspection_cache:
        insp = FoodSafetyAgencyInspection.objects.filter(id=int(inspection_id)).first()
        inspection_cache[inspection_id] = insp
    return inspection_cache[inspection_id]

renamed = 0
skipped = 0
errors = 0

print(f"{'DRY RUN - ' if DRY_RUN else ''}Scanning {DOCS_DIR}...\n")

for client_dir_id in sorted(os.listdir(DOCS_DIR)):
    client_path = os.path.join(DOCS_DIR, client_dir_id)
    if not os.path.isdir(client_path):
        continue

    for insp_dir_id in sorted(os.listdir(client_path)):
        insp_path = os.path.join(client_path, insp_dir_id)
        if not os.path.isdir(insp_path):
            continue

        # Look up the inspection
        inspection = get_inspection(insp_dir_id)
        if not inspection:
            print(f"  SKIP: No inspection found for id={insp_dir_id}")
            skipped += 1
            continue

        client_name = inspection.client_name or 'Unknown'
        clean_client = clean_name(client_name)

        if inspection.date_of_inspection:
            date_str = inspection.date_of_inspection.strftime('%y%m%d')
        else:
            date_str = '000000'

        for doc_type in os.listdir(insp_path):
            type_path = os.path.join(insp_path, doc_type)
            if not os.path.isdir(type_path):
                continue

            type_label = TYPE_LABEL_MAP.get(doc_type, doc_type.upper())

            files = sorted(os.listdir(type_path))
            for i, filename in enumerate(files):
                file_path = os.path.join(type_path, filename)
                if not os.path.isfile(file_path):
                    continue

                ext = os.path.splitext(filename)[1]  # .pdf, .jpg, etc.

                # Build new name. If multiple files in same folder, add suffix
                if len(files) == 1:
                    new_name = f"FSA-{clean_client}-{type_label}-{date_str}{ext}"
                else:
                    new_name = f"FSA-{clean_client}-{type_label}-{date_str}-{i+1}{ext}"

                # Check if already correctly named
                if filename == new_name:
                    skipped += 1
                    continue

                new_path = os.path.join(type_path, new_name)

                print(f"  {os.path.relpath(file_path, DOCS_DIR)}")
                print(f"    -> {new_name}")

                if not DRY_RUN:
                    try:
                        os.rename(file_path, new_path)
                        renamed += 1
                    except Exception as e:
                        print(f"    ERROR: {e}")
                        errors += 1
                else:
                    renamed += 1

print(f"\n{'DRY RUN ' if DRY_RUN else ''}DONE: {renamed} renamed, {skipped} skipped, {errors} errors")
