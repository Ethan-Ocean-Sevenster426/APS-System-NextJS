"""Create bank account and pay ~80 invoices in Xero."""
import os, django, requests, random, time
from datetime import datetime, timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()
from main.services import xero_service

access_token, tenant_id = xero_service._get_valid_token()
headers = {
    'Authorization': f'Bearer {access_token}',
    'Xero-Tenant-Id': tenant_id,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}

# Find or create bank account
where_filter = 'Type=="BANK"'
r = requests.get(f'{xero_service.XERO_API_URL}/Accounts', params={'where': where_filter}, headers=headers)
accounts = r.json().get('Accounts', [])
print(f'Bank accounts found: {len(accounts)}')

if accounts:
    bank_id = accounts[0]['AccountID']
    print(f'Using: {accounts[0]["Name"]} ({bank_id})')
else:
    print('Creating bank account...')
    data = {'Name': 'Business Bank Account', 'Code': '090', 'Type': 'BANK', 'BankAccountNumber': '123456789', 'CurrencyCode': 'ZAR'}
    r2 = requests.put(f'{xero_service.XERO_API_URL}/Accounts', json=data, headers=headers)
    r2.raise_for_status()
    bank_id = r2.json()['Accounts'][0]['AccountID']
    print(f'Created bank account: {bank_id}')

# Get all AUTHORISED invoices
print('\nFetching AUTHORISED invoices...')
all_authorised = []
page = 1
while True:
    r = requests.get(
        f'{xero_service.XERO_API_URL}/Invoices',
        params={'Statuses': 'AUTHORISED', 'page': page, 'where': 'Type=="ACCREC"'},
        headers=headers,
    )
    r.raise_for_status()
    invoices = r.json().get('Invoices', [])
    if not invoices:
        break
    all_authorised.extend(invoices)
    if len(invoices) < 100:
        break
    page += 1

print(f'Found {len(all_authorised)} AUTHORISED invoices')

# Pick ~80 to pay
to_pay = random.sample(all_authorised, min(80, len(all_authorised)))
print(f'Will pay {len(to_pay)} invoices...\n')

paid = 0
errors = 0
today = datetime.now().date()

for i, inv in enumerate(to_pay):
    inv_id = inv['InvoiceID']
    inv_num = inv.get('InvoiceNumber', '?')
    total = inv.get('Total', 0)
    contact = inv.get('Contact', {}).get('Name', '?')
    
    # Random pay date
    inv_date_str = inv.get('DateString', '')
    try:
        inv_date = datetime.strptime(inv_date_str[:10], '%Y-%m-%d').date()
        pay_date = inv_date + timedelta(days=random.randint(5, 45))
        if pay_date > today:
            pay_date = today
    except:
        pay_date = today

    try:
        # Refresh token periodically
        if i % 20 == 0 and i > 0:
            access_token, tenant_id = xero_service._get_valid_token()
            headers['Authorization'] = f'Bearer {access_token}'

        payment_data = {
            "Payments": [{
                "Invoice": {"InvoiceID": inv_id},
                "Account": {"AccountID": bank_id},
                "Amount": total,
                "Date": pay_date.strftime("%Y-%m-%d"),
            }]
        }
        pr = requests.put(
            f'{xero_service.XERO_API_URL}/Payments',
            json=payment_data,
            headers=headers,
        )
        if pr.status_code == 429:
            retry = int(pr.headers.get('Retry-After', 60))
            print(f'  Rate limited. Waiting {retry}s...')
            time.sleep(retry + 1)
            access_token, tenant_id = xero_service._get_valid_token()
            headers['Authorization'] = f'Bearer {access_token}'
            pr = requests.put(f'{xero_service.XERO_API_URL}/Payments', json=payment_data, headers=headers)
        
        pr.raise_for_status()
        paid += 1
        print(f'  [{i+1}/{len(to_pay)}] {inv_num} - {contact} - R{total:.2f} - PAID')
    except Exception as e:
        errors += 1
        print(f'  [{i+1}/{len(to_pay)}] {inv_num} - FAILED: {e}')
    
    time.sleep(0.5)  # Rate limit safety

print(f'\n{"="*50}')
print(f'Paid: {paid} invoices')
print(f'Errors: {errors}')
