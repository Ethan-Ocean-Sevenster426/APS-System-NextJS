"""
Xero OAuth2 Connection Script
Starts a local server on port 8080, opens browser for auth, exchanges code for tokens.
"""
import http.server
import webbrowser
import requests
import json
import sys
import os
import threading
from urllib.parse import urlencode, urlparse, parse_qs

# === CONFIGURATION ===
CLIENT_ID = 'CD1AB8B76E8D43B99547973C9BB25CF0'
CLIENT_SECRET = 'H0uPFSJs2kfwH4aZ17BB6WTDWuYKkzycrOxpYIc2st8KnYEb'
REDIRECT_URI = 'http://localhost:8080/callback'
PORT = 8080

XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'
XERO_API_URL = 'https://api.xero.com/api.xro/2.0'

# NEW granular scopes (required for apps created after March 2, 2026)
# Old broad scopes like accounting.transactions are NOT available for new apps
SCOPES = 'openid profile email offline_access accounting.invoices accounting.payments accounting.contacts accounting.settings.read accounting.reports.aged.read accounting.reports.profitandloss.read'

result_data = {}
server_should_stop = False


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global result_data, server_should_stop
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == '/callback' and 'code' in params:
            code = params['code'][0]
            print(f"\n[OK] Authorization code received!")
            print(f"[...] Exchanging code for tokens...")

            try:
                # Exchange code for tokens
                token_response = requests.post(
                    XERO_TOKEN_URL,
                    data={
                        'grant_type': 'authorization_code',
                        'code': code,
                        'redirect_uri': REDIRECT_URI,
                    },
                    auth=(CLIENT_ID, CLIENT_SECRET),
                    headers={'Content-Type': 'application/x-www-form-urlencoded'},
                    timeout=30,
                )

                if token_response.status_code != 200:
                    error_text = token_response.text
                    print(f"\n[ERROR] Token exchange failed ({token_response.status_code}):")
                    print(f"  {error_text}")
                    self._send_html(400, f"""
                        <h2 style="color: red;">Token Exchange Failed</h2>
                        <p>Status: {token_response.status_code}</p>
                        <pre>{error_text}</pre>
                    """)
                    server_should_stop = True
                    return

                token_data = token_response.json()
                access_token = token_data['access_token']
                refresh_token = token_data.get('refresh_token', '')
                expires_in = token_data.get('expires_in', 1800)

                print(f"[OK] Tokens received! (expires in {expires_in}s)")

                # Get tenant connections
                print(f"[...] Getting connected tenants...")
                conn_response = requests.get(
                    XERO_CONNECTIONS_URL,
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=30,
                )
                connections = conn_response.json() if conn_response.status_code == 200 else []

                tenant_id = ''
                tenant_name = ''
                if connections:
                    tenant_id = connections[0].get('tenantId', '')
                    tenant_name = connections[0].get('tenantName', '')
                    print(f"[OK] Connected to: {tenant_name} (ID: {tenant_id})")
                else:
                    print(f"[WARN] No tenants found")

                result_data = {
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'expires_in': expires_in,
                    'tenant_id': tenant_id,
                    'tenant_name': tenant_name,
                    'connections': connections,
                }

                # Save tokens to file
                with open('xero_tokens.json', 'w') as f:
                    json.dump(result_data, f, indent=2)
                print(f"[OK] Tokens saved to xero_tokens.json")

                # Try a test API call - get organisation info
                print(f"\n[...] Testing API - fetching organisation info...")
                try:
                    org_response = requests.get(
                        f"{XERO_API_URL}/Organisation",
                        headers={
                            'Authorization': f'Bearer {access_token}',
                            'Xero-Tenant-Id': tenant_id,
                            'Accept': 'application/json',
                        },
                        timeout=30,
                    )
                    if org_response.status_code == 200:
                        org_data = org_response.json()
                        orgs = org_data.get('Organisations', [])
                        if orgs:
                            org = orgs[0]
                            print(f"[OK] Organisation: {org.get('Name', 'N/A')}")
                            print(f"     Legal Name: {org.get('LegalName', 'N/A')}")
                            print(f"     Country: {org.get('CountryCode', 'N/A')}")
                            print(f"     Base Currency: {org.get('BaseCurrency', 'N/A')}")
                    else:
                        print(f"[WARN] Org API returned {org_response.status_code}: {org_response.text[:200]}")
                except Exception as e:
                    print(f"[WARN] Could not fetch org info: {e}")

                # Try fetching invoices
                print(f"\n[...] Testing API - fetching recent invoices...")
                try:
                    inv_response = requests.get(
                        f"{XERO_API_URL}/Invoices",
                        params={'page': 1, 'order': 'Date DESC'},
                        headers={
                            'Authorization': f'Bearer {access_token}',
                            'Xero-Tenant-Id': tenant_id,
                            'Accept': 'application/json',
                        },
                        timeout=30,
                    )
                    if inv_response.status_code == 200:
                        inv_data = inv_response.json()
                        invoices = inv_data.get('Invoices', [])
                        print(f"[OK] Found {len(invoices)} invoices on page 1")
                        for inv in invoices[:5]:
                            print(f"     - {inv.get('InvoiceNumber', 'N/A')}: {inv.get('Contact', {}).get('Name', 'N/A')} - {inv.get('Status', 'N/A')} - {inv.get('Total', 0)}")
                    else:
                        print(f"[WARN] Invoices API returned {inv_response.status_code}: {inv_response.text[:200]}")
                except Exception as e:
                    print(f"[WARN] Could not fetch invoices: {e}")

                self._send_html(200, f"""
                    <h2 style="color: green;">Connected to Xero Successfully!</h2>
                    <p><strong>Organisation:</strong> {tenant_name}</p>
                    <p><strong>Tenant ID:</strong> {tenant_id}</p>
                    <p>Tokens saved to <code>xero_tokens.json</code></p>
                    <p>You can close this window now.</p>
                """)

            except Exception as e:
                print(f"\n[ERROR] {e}")
                import traceback
                traceback.print_exc()
                self._send_html(500, f"""
                    <h2 style="color: red;">Error</h2>
                    <pre>{str(e)}</pre>
                """)

            server_should_stop = True

        elif parsed.path == '/callback' and 'error' in params:
            error = params.get('error', ['unknown'])[0]
            error_desc = params.get('error_description', ['No description'])[0]
            print(f"\n[ERROR] Authorization failed: {error}")
            print(f"  Description: {error_desc}")
            self._send_html(400, f"""
                <h2 style="color: red;">Authorization Error</h2>
                <p><strong>Error:</strong> {error}</p>
                <p><strong>Description:</strong> {error_desc}</p>
            """)
            server_should_stop = True

        else:
            self._send_html(404, "<h2>Not Found</h2>")

    def _send_html(self, status, body):
        self.send_response(status)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        html = f'''<!DOCTYPE html>
<html><head><title>Xero Connection</title></head>
<body style="font-family: Arial, sans-serif; padding: 50px; max-width: 600px; margin: 0 auto;">
{body}
</body></html>'''
        self.wfile.write(html.encode())

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logging


def main():
    print("=" * 70)
    print(" XERO OAUTH2 CONNECTION")
    print("=" * 70)
    print(f"\n  Client ID:    {CLIENT_ID}")
    print(f"  Redirect URI: {REDIRECT_URI}")
    print(f"  Port:         {PORT}")
    print(f"  Scopes:       {SCOPES}")

    # Build auth URL
    auth_params = {
        'response_type': 'code',
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPES,
        'state': 'xero_connect',
    }
    auth_url = f'{XERO_AUTH_URL}?{urlencode(auth_params)}'

    print(f"\n[...] Starting local server on port {PORT}...")

    server = http.server.HTTPServer(('localhost', PORT), CallbackHandler)
    server.timeout = 1

    print(f"[OK] Server started on http://localhost:{PORT}")
    print(f"\n[...] Opening browser for Xero authorization...")
    print(f"\n  Auth URL: {auth_url}\n")

    webbrowser.open(auth_url)

    print("  Waiting for authorization callback...")
    print("  (Press Ctrl+C to cancel)\n")

    try:
        while not server_should_stop:
            server.handle_request()
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")

    server.server_close()

    if result_data:
        print("\n" + "=" * 70)
        print(" CONNECTION SUCCESSFUL")
        print("=" * 70)
        print(f"\n  Tenant: {result_data.get('tenant_name', 'N/A')}")
        print(f"  Tokens saved to: xero_tokens.json")
        print(f"\n  Next steps:")
        print(f"  1. Update your .env file with the Xero credentials")
        print(f"  2. Or use Django integration via xero_service.py")
        print("=" * 70)
    else:
        print("\n[FAILED] Connection was not completed.")
        print("  Check the error messages above and try again.")


if __name__ == '__main__':
    main()
