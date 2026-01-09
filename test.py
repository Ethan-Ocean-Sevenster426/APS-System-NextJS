"""
Test script to verify file detection for button colors
"""
import os
import sys
import re
from datetime import date

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

import django
django.setup()

from django.conf import settings
from django.core.cache import cache

# Clear all caches first
print("=" * 60)
print("CLEARING ALL CACHES")
print("=" * 60)
cache.clear()
print("Django cache cleared!")

# Test configuration
CLIENT_NAME = 'Chicken King Farms'
INSPECTION_DATE = date(2026, 1, 6)

print("\n" + "=" * 60)
print(f"TESTING FILE DETECTION FOR: {CLIENT_NAME}")
print(f"DATE: {INSPECTION_DATE}")
print("=" * 60)

def create_folder_name(name):
    if not name:
        return "unknown_client"
    clean_name = re.sub(r'[^a-zA-Z0-9\s\-_]', '', name)
    clean_name = clean_name.replace(' ', '_').replace('-', '_')
    clean_name = re.sub(r'_+', '_', clean_name)
    clean_name = clean_name.strip('_').lower()
    return clean_name or "unknown_client"

# Build folder variations
sanitized = create_folder_name(CLIENT_NAME)
folder_variations = [
    sanitized,
    f'btn_{sanitized}',
    f'group_{sanitized}',
    CLIENT_NAME
]

print(f"\nFolder variations to check: {folder_variations}")

# Build path
inspection_base = os.path.join(settings.MEDIA_ROOT, 'inspection')
year = INSPECTION_DATE.strftime('%Y')
month = INSPECTION_DATE.strftime('%B')
parent_path = os.path.join(inspection_base, year, month)

print(f"Base path: {parent_path}")
print(f"Path exists: {os.path.exists(parent_path)}")

# Check what folders actually exist
print("\n" + "-" * 60)
print("FOLDERS THAT EXIST:")
print("-" * 60)
for folder in folder_variations:
    full_path = os.path.join(parent_path, folder)
    exists = os.path.exists(full_path)
    if exists:
        contents = os.listdir(full_path)
        print(f"  [EXISTS] {folder}/")
        for item in contents:
            item_path = os.path.join(full_path, item)
            if os.path.isdir(item_path):
                files = os.listdir(item_path)
                print(f"           -> {item}/ ({len(files)} files)")
                for f in files[:3]:  # Show first 3 files
                    print(f"              - {f}")
                if len(files) > 3:
                    print(f"              ... and {len(files) - 3} more")
    else:
        print(f"  [MISSING] {folder}/")

# Now run the actual detection
print("\n" + "-" * 60)
print("FILE DETECTION RESULTS:")
print("-" * 60)

has_rfi = has_invoice = has_lab = has_compliance = has_composition = has_occurrence = False

for folder_variation in folder_variations:
    test_path = os.path.join(parent_path, folder_variation)
    if not os.path.exists(test_path):
        continue

    # Check RFI
    for rfi_var in ['RFI', 'rfi', 'Request For Invoice', 'request for invoice']:
        rfi_path = os.path.join(test_path, rfi_var)
        if os.path.exists(rfi_path) and os.listdir(rfi_path):
            has_rfi = True
            print(f"  RFI: FOUND in {folder_variation}/{rfi_var}/ -> {os.listdir(rfi_path)}")

    # Check Invoice
    for inv_var in ['Invoice', 'invoice']:
        invoice_path = os.path.join(test_path, inv_var)
        if os.path.exists(invoice_path) and os.listdir(invoice_path):
            has_invoice = True
            print(f"  Invoice: FOUND in {folder_variation}/{inv_var}/ -> {os.listdir(invoice_path)}")

    # Check Lab
    for lab_var in ['Lab', 'lab', 'Lab Results', 'lab results']:
        lab_path = os.path.join(test_path, lab_var)
        if os.path.exists(lab_path) and os.listdir(lab_path):
            has_lab = True
            print(f"  Lab: FOUND in {folder_variation}/{lab_var}/ -> {os.listdir(lab_path)}")

    # Check Compliance
    for comp_var in ['Compliance', 'compliance']:
        comp_path = os.path.join(test_path, comp_var)
        if os.path.exists(comp_path) and os.listdir(comp_path):
            has_compliance = True
            print(f"  Compliance: FOUND in {folder_variation}/{comp_var}/ -> {os.listdir(comp_path)}")

    # Check Composition
    for comp_var in ['Composition', 'composition']:
        comp_path = os.path.join(test_path, comp_var)
        if os.path.exists(comp_path) and os.listdir(comp_path):
            has_composition = True
            print(f"  Composition: FOUND in {folder_variation}/{comp_var}/ -> {os.listdir(comp_path)}")

    # Check Occurrence
    for occ_var in ['Occurrence', 'occurrence']:
        occ_path = os.path.join(test_path, occ_var)
        if os.path.exists(occ_path) and os.listdir(occ_path):
            has_occurrence = True
            print(f"  Occurrence: FOUND in {folder_variation}/{occ_var}/ -> {os.listdir(occ_path)}")

print("\n" + "=" * 60)
print("FINAL RESULTS (what buttons should show):")
print("=" * 60)
print(f"  RFI:         {'GREEN (file exists)' if has_rfi else 'RED (no file)'}")
print(f"  Invoice:     {'GREEN (file exists)' if has_invoice else 'RED (no file)'}")
print(f"  Lab/COA:     {'GREEN (file exists)' if has_lab else 'RED (no file)'}")
print(f"  Compliance:  {'GREEN (file exists)' if has_compliance else 'RED (no file)'}")
print(f"  Composition: {'GREEN (file exists)' if has_composition else 'RED (no file)'}")
print(f"  Occurrence:  {'GREEN (file exists)' if has_occurrence else 'RED (no file)'}")
print("=" * 60)

# Summary
print("\nSUMMARY:")
print(f"  has_rfi = {has_rfi}")
print(f"  has_invoice = {has_invoice}")
print(f"  has_lab = {has_lab}")
print(f"  has_compliance = {has_compliance}")
print(f"  has_composition = {has_composition}")
print(f"  has_occurrence = {has_occurrence}")

print("\n" + "=" * 60)
print("TESTING FILE LISTING (View Files popup)")
print("=" * 60)

# Test the file listing with folder variations
category_folder_variations = {
    'rfi': ['rfi', 'RFI', 'Request For Invoice', 'request for invoice'],
    'invoice': ['invoice', 'Invoice'],
    'lab': ['lab', 'Lab', 'lab results', 'Lab Results', 'coa', 'COA'],
    'compliance': ['compliance', 'Compliance'],
    'occurrence': ['occurrence', 'Occurrence'],
    'composition': ['composition', 'Composition'],
    'other': ['other', 'Other']
}

files_found = {}
for folder_variation in folder_variations:
    test_path = os.path.join(parent_path, folder_variation)
    if not os.path.exists(test_path):
        continue

    print(f"\nSearching in: {folder_variation}/")

    for category_key, folder_vars in category_folder_variations.items():
        for folder_var in folder_vars:
            category_path = os.path.join(test_path, folder_var)
            if os.path.exists(category_path):
                files = [f for f in os.listdir(category_path) if os.path.isfile(os.path.join(category_path, f))]
                if files:
                    if category_key not in files_found:
                        files_found[category_key] = []
                    files_found[category_key].extend(files)
                    print(f"  {category_key} ({folder_var}): {len(files)} files")

print("\n" + "-" * 60)
print("FILES THAT SHOULD APPEAR IN VIEW FILES POPUP:")
print("-" * 60)
for cat, files in files_found.items():
    print(f"  {cat.upper()}: {len(files)} files")
    for f in files[:2]:
        print(f"    - {f}")
    if len(files) > 2:
        print(f"    ... and {len(files) - 2} more")

print("\n" + "=" * 60)
print("If buttons show wrong colors after page refresh,")
print("the issue is likely browser caching.")
print("Try: Ctrl+Shift+R or clear browser cache")
print("=" * 60)
