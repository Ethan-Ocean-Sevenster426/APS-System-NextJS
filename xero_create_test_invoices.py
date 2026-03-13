"""Create test dummy invoices in Xero Test Business."""
import requests
import json
from datetime import datetime, timedelta

with open('xero_tokens.json') as f:
    tokens = json.load(f)

access_token = tokens['access_token']
tenant_id = tokens['tenant_id']
refresh_token = tokens['refresh_token']

XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
XERO_API_URL = 'https://api.xero.com/api.xro/2.0'
CLIENT_ID = 'CD1AB8B76E8D43B99547973C9BB25CF0'
CLIENT_SECRET = 'H0uPFSJs2kfwH4aZ17BB6WTDWuYKkzycrOxpYIc2st8KnYEb'

headers = {
    'Authorization': f'Bearer {access_token}',
    'Xero-Tenant-Id': tenant_id,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}


def refresh_if_needed():
    """Refresh token if expired."""
    global headers, tokens
    test = requests.get(f'{XERO_API_URL}/Organisation', headers=headers, timeout=30)
    if test.status_code == 401:
        print("[...] Refreshing token...")
        resp = requests.post(
            XERO_TOKEN_URL,
            data={'grant_type': 'refresh_token', 'refresh_token': tokens['refresh_token']},
            auth=(CLIENT_ID, CLIENT_SECRET),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=30,
        )
        if resp.status_code == 200:
            new = resp.json()
            tokens['access_token'] = new['access_token']
            tokens['refresh_token'] = new.get('refresh_token', tokens['refresh_token'])
            with open('xero_tokens.json', 'w') as f:
                json.dump(tokens, f, indent=2)
            headers['Authorization'] = f'Bearer {new["access_token"]}'
            print("[OK] Token refreshed!")
        else:
            print(f"[ERROR] Refresh failed: {resp.text}")
            exit(1)


refresh_if_needed()

today = datetime.now()

# Test invoices to create
test_invoices = [
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Woolworths Food SA"},
        "Date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
        "DueDate": (today + timedelta(days=25)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0001",
        "Reference": "Inspection - Cape Town Plant",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "Food Safety Inspection - Full Audit", "Quantity": 1, "UnitAmount": 8500.00, "AccountCode": "200"},
            {"Description": "Laboratory Testing - Microbiological", "Quantity": 3, "UnitAmount": 1200.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Pick n Pay Stores"},
        "Date": (today - timedelta(days=12)).strftime("%Y-%m-%d"),
        "DueDate": (today + timedelta(days=18)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0002",
        "Reference": "Inspection - Johannesburg DC",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "HACCP Compliance Audit", "Quantity": 1, "UnitAmount": 12000.00, "AccountCode": "200"},
            {"Description": "Corrective Action Follow-up", "Quantity": 2, "UnitAmount": 3500.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Checkers Shoprite Group"},
        "Date": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
        "DueDate": (today - timedelta(days=0)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0003",
        "Reference": "Inspection - Durban Facility",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "Food Safety Inspection - Standard", "Quantity": 1, "UnitAmount": 6500.00, "AccountCode": "200"},
            {"Description": "Water Quality Testing", "Quantity": 5, "UnitAmount": 850.00, "AccountCode": "200"},
            {"Description": "Travel & Accommodation", "Quantity": 1, "UnitAmount": 2200.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Tiger Brands Ltd"},
        "Date": (today - timedelta(days=60)).strftime("%Y-%m-%d"),
        "DueDate": (today - timedelta(days=30)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0004",
        "Reference": "Inspection - Springs Factory",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "ISO 22000 Gap Analysis", "Quantity": 1, "UnitAmount": 18000.00, "AccountCode": "200"},
            {"Description": "Documentation Review", "Quantity": 1, "UnitAmount": 4500.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Clover Industries"},
        "Date": (today - timedelta(days=90)).strftime("%Y-%m-%d"),
        "DueDate": (today - timedelta(days=60)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0005",
        "Reference": "Inspection - Lichtenburg Dairy",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "Dairy Processing Plant Audit", "Quantity": 1, "UnitAmount": 15000.00, "AccountCode": "200"},
            {"Description": "Environmental Monitoring", "Quantity": 4, "UnitAmount": 2000.00, "AccountCode": "200"},
            {"Description": "Staff Training Session", "Quantity": 1, "UnitAmount": 5500.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "RCL Foods"},
        "Date": (today - timedelta(days=3)).strftime("%Y-%m-%d"),
        "DueDate": (today + timedelta(days=27)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0006",
        "Reference": "Inspection - Pretoria Poultry",
        "Status": "DRAFT",
        "LineItems": [
            {"Description": "Poultry Processing Inspection", "Quantity": 1, "UnitAmount": 9500.00, "AccountCode": "200"},
            {"Description": "Pest Control Assessment", "Quantity": 1, "UnitAmount": 3200.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Spar Group Ltd"},
        "Date": (today - timedelta(days=45)).strftime("%Y-%m-%d"),
        "DueDate": (today - timedelta(days=15)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0007",
        "Reference": "Inspection - Port Elizabeth Store",
        "Status": "PAID",
        "LineItems": [
            {"Description": "Retail Food Safety Audit", "Quantity": 1, "UnitAmount": 5500.00, "AccountCode": "200"},
            {"Description": "Cold Chain Verification", "Quantity": 1, "UnitAmount": 2800.00, "AccountCode": "200"},
        ]
    },
    {
        "Type": "ACCREC",
        "Contact": {"Name": "Nestle South Africa"},
        "Date": (today - timedelta(days=20)).strftime("%Y-%m-%d"),
        "DueDate": (today + timedelta(days=10)).strftime("%Y-%m-%d"),
        "LineAmountTypes": "Exclusive",
        "InvoiceNumber": "INV-0008",
        "Reference": "Inspection - Babelegi Factory",
        "Status": "AUTHORISED",
        "LineItems": [
            {"Description": "BRC Global Standard Audit", "Quantity": 1, "UnitAmount": 22000.00, "AccountCode": "200"},
            {"Description": "Allergen Management Review", "Quantity": 1, "UnitAmount": 4800.00, "AccountCode": "200"},
            {"Description": "Report & Certificate", "Quantity": 1, "UnitAmount": 1500.00, "AccountCode": "200"},
        ]
    },
]

print("=" * 80)
print(" CREATING TEST INVOICES IN XERO")
print("=" * 80)

created = 0
errors = 0

for inv in test_invoices:
    inv_num = inv['InvoiceNumber']
    contact = inv['Contact']['Name']
    status = inv['Status']
    total = sum(li['Quantity'] * li['UnitAmount'] for li in inv['LineItems'])

    print(f"\n[...] Creating {inv_num} - {contact} ({status}) - R{total:,.2f}")

    resp = requests.post(
        f'{XERO_API_URL}/Invoices',
        headers=headers,
        json={"Invoices": [inv]},
        timeout=30,
    )

    if resp.status_code == 200:
        result = resp.json()
        created_inv = result.get('Invoices', [{}])[0]
        warnings = created_inv.get('Warnings', [])
        validation_errors = created_inv.get('ValidationErrors', [])

        if validation_errors:
            print(f"  [WARN] Validation errors:")
            for ve in validation_errors:
                print(f"    - {ve.get('Message', 'Unknown')}")
            errors += 1
        else:
            print(f"  [OK] Created! ID: {created_inv.get('InvoiceID', 'N/A')[:20]}...")
            created += 1
            if warnings:
                for w in warnings:
                    print(f"  [WARN] {w.get('Message', '')}")
    else:
        print(f"  [ERROR] {resp.status_code}: {resp.text[:200]}")
        errors += 1

print(f"\n{'='*80}")
print(f" DONE: {created} created, {errors} errors")
print(f"{'='*80}")

if created > 0:
    print(f"\n Now run: python xero_list_invoices.py  to see all invoices")
