"""Fetch and display all invoices from Xero."""
import requests
import json

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
}

# Try fetching, refresh token if expired
response = requests.get(f'{XERO_API_URL}/Invoices', params={'order': 'Date DESC'}, headers=headers, timeout=30)

if response.status_code == 401:
    print("[...] Token expired, refreshing...")
    token_resp = requests.post(
        XERO_TOKEN_URL,
        data={'grant_type': 'refresh_token', 'refresh_token': refresh_token},
        auth=(CLIENT_ID, CLIENT_SECRET),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=30,
    )
    if token_resp.status_code == 200:
        new_tokens = token_resp.json()
        tokens['access_token'] = new_tokens['access_token']
        tokens['refresh_token'] = new_tokens.get('refresh_token', refresh_token)
        with open('xero_tokens.json', 'w') as f:
            json.dump(tokens, f, indent=2)
        headers['Authorization'] = f'Bearer {new_tokens["access_token"]}'
        response = requests.get(f'{XERO_API_URL}/Invoices', params={'order': 'Date DESC'}, headers=headers, timeout=30)
        print("[OK] Token refreshed!")
    else:
        print(f"[ERROR] Token refresh failed: {token_resp.status_code} {token_resp.text}")
        exit(1)

if response.status_code != 200:
    print(f"[ERROR] {response.status_code}: {response.text[:500]}")
    exit(1)

data = response.json()
invoices = data.get('Invoices', [])

print(f"\n{'='*100}")
print(f" XERO INVOICES - Test Business")
print(f" Total: {len(invoices)} invoices")
print(f"{'='*100}")
print(f"\n{'No.':<5} {'Invoice #':<15} {'Type':<8} {'Status':<12} {'Date':<12} {'Due Date':<12} {'Contact':<30} {'Total':>12} {'Due':>12}")
print(f"{'-'*5} {'-'*15} {'-'*8} {'-'*12} {'-'*12} {'-'*12} {'-'*30} {'-'*12} {'-'*12}")

total_due = 0
total_amount = 0

for i, inv in enumerate(invoices, 1):
    inv_num = inv.get('InvoiceNumber', 'N/A')
    inv_type = inv.get('Type', 'N/A')
    status = inv.get('Status', 'N/A')
    date = inv.get('DateString', 'N/A')[:10] if inv.get('DateString') else 'N/A'
    due_date = inv.get('DueDateString', 'N/A')[:10] if inv.get('DueDateString') else 'N/A'
    contact = inv.get('Contact', {}).get('Name', 'N/A')[:28]
    total = inv.get('Total', 0)
    amount_due = inv.get('AmountDue', 0)
    currency = inv.get('CurrencyCode', 'ZAR')

    total_amount += total
    total_due += amount_due

    print(f"{i:<5} {inv_num:<15} {inv_type:<8} {status:<12} {date:<12} {due_date:<12} {contact:<30} {total:>12,.2f} {amount_due:>12,.2f}")

print(f"\n{'-'*120}")
print(f"{'TOTALS':>94} {total_amount:>12,.2f} {total_due:>12,.2f}")
print(f"{'='*100}")

# Summary by status
statuses = {}
for inv in invoices:
    s = inv.get('Status', 'UNKNOWN')
    if s not in statuses:
        statuses[s] = {'count': 0, 'total': 0, 'due': 0}
    statuses[s]['count'] += 1
    statuses[s]['total'] += inv.get('Total', 0)
    statuses[s]['due'] += inv.get('AmountDue', 0)

print(f"\n SUMMARY BY STATUS:")
print(f" {'Status':<15} {'Count':>8} {'Total':>15} {'Amount Due':>15}")
print(f" {'-'*15} {'-'*8} {'-'*15} {'-'*15}")
for s, v in sorted(statuses.items()):
    print(f" {s:<15} {v['count']:>8} {v['total']:>15,.2f} {v['due']:>15,.2f}")
