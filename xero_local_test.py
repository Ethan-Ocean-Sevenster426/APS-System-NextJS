"""
Temporary local script to test Xero OAuth2 flow.
Starts a local server on port 8080, opens browser to Xero login,
captures the callback code, exchanges it for tokens, and tests the API.
Delete this file after testing.
"""
import http.server
import webbrowser
import requests
import json
import sys
from urllib.parse import urlencode, urlparse, parse_qs

CLIENT_ID = 'B69B5EBB13ED43D3BB1A2D7D16DC921D'
CLIENT_SECRET = 'qkN2rkstYVx48t7Svs7s50TysZvYzzK7hRXqdJcujCdqb2Lj'
REDIRECT_URI = 'http://localhost:8080/callback'
# Try simpler scopes - Xero uncertified apps may not support all scope types
# Start with accounting.transactions and offline_access
SCOPES = 'accounting.transactions offline_access'

captured_code = None


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global captured_code
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if 'code' in params:
            captured_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body><h2>Xero Authorization Successful!</h2><p>You can close this window. Check your terminal for results.</p></body></html>')
        elif 'error' in params:
            self.send_response(400)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            error = params.get('error', ['unknown'])[0]
            self.wfile.write(f'<html><body><h2>Error: {error}</h2></body></html>'.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress request logging


def main():
    # Build auth URL
    auth_params = {
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPES,
        'state': 'local_test',
    }
    auth_url = f'https://login.xero.com/identity/connect/authorize?{urlencode(auth_params)}'

    # Start local server
    server = http.server.HTTPServer(('localhost', 8080), CallbackHandler)
    print('Starting local callback server on http://localhost:8080...')
    print('Opening browser for Xero login...\n')
    webbrowser.open(auth_url)

    # Wait for callback
    print('Waiting for Xero callback...')
    while captured_code is None:
        server.handle_request()

    print(f'\nAuthorization code received!')
    print(f'Code: {captured_code[:20]}...\n')

    # Exchange code for tokens
    print('Exchanging code for tokens...')
    token_response = requests.post(
        'https://identity.xero.com/connect/token',
        data={
            'grant_type': 'authorization_code',
            'code': captured_code,
            'redirect_uri': REDIRECT_URI,
        },
        auth=(CLIENT_ID, CLIENT_SECRET),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )

    if token_response.status_code != 200:
        print(f'ERROR: Token exchange failed ({token_response.status_code})')
        print(token_response.text)
        return

    token_data = token_response.json()
    access_token = token_data['access_token']
    refresh_token = token_data.get('refresh_token', '')
    expires_in = token_data.get('expires_in', 0)

    print(f'Access token received! (expires in {expires_in}s)')
    print(f'Refresh token: {refresh_token[:20]}...\n')

    # Get tenant connections
    print('Fetching tenant connections...')
    conn_response = requests.get(
        'https://api.xero.com/connections',
        headers={'Authorization': f'Bearer {access_token}'},
    )

    if conn_response.status_code != 200:
        print(f'ERROR: Connections failed ({conn_response.status_code})')
        print(conn_response.text)
        return

    connections = conn_response.json()
    if not connections:
        print('No Xero organisations connected!')
        return

    tenant_id = connections[0].get('tenantId', '')
    tenant_name = connections[0].get('tenantName', '')
    print(f'Connected to: {tenant_name} (tenant: {tenant_id})\n')

    # Test: Fetch invoices
    print('Fetching invoices...')
    inv_response = requests.get(
        'https://api.xero.com/api.xro/2.0/Invoices',
        params={'page': 1, 'order': 'DueDate DESC'},
        headers={
            'Authorization': f'Bearer {access_token}',
            'Xero-Tenant-Id': tenant_id,
            'Accept': 'application/json',
        },
    )

    if inv_response.status_code != 200:
        print(f'ERROR: Invoices failed ({inv_response.status_code})')
        print(inv_response.text)
        return

    invoices = inv_response.json().get('Invoices', [])
    print(f'Found {len(invoices)} invoices!\n')

    if invoices:
        print('First 5 invoices:')
        print('-' * 80)
        for inv in invoices[:5]:
            contact = inv.get('Contact', {})
            print(f"  {inv.get('InvoiceNumber', '?'):>10} | {contact.get('Name', '?'):<30} | "
                  f"R{inv.get('Total', 0):>10,.2f} | Due: {inv.get('DueDateString', '?')} | "
                  f"Status: {inv.get('Status', '?')} | Outstanding: R{inv.get('AmountDue', 0):>10,.2f}")
        print('-' * 80)

    # Test: Fetch contacts
    print('\nFetching contacts...')
    cont_response = requests.get(
        'https://api.xero.com/api.xro/2.0/Contacts',
        params={'page': 1},
        headers={
            'Authorization': f'Bearer {access_token}',
            'Xero-Tenant-Id': tenant_id,
            'Accept': 'application/json',
        },
    )

    if cont_response.status_code == 200:
        contacts = cont_response.json().get('Contacts', [])
        print(f'Found {len(contacts)} contacts!')
    else:
        print(f'Contacts failed ({cont_response.status_code})')

    print('\n=== XERO INTEGRATION TEST COMPLETE ===')
    print('Everything is working! Deploy to server and add .env variables.')


if __name__ == '__main__':
    main()
