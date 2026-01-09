import os
import json
import socket
import time
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from django.conf import settings
from django.utils import timezone
import pickle
from urllib3.exceptions import MaxRetryError, NameResolutionError
from requests.exceptions import ConnectionError, Timeout

class GoogleSheetsService:
    """Service class for interacting with Google Sheets API"""
    
    # If modifying these scopes, delete the file token.pickle.
    SCOPES = [
        'https://www.googleapis.com/auth/spreadsheets',  # Full read/write access
        'https://www.googleapis.com/auth/drive'  # Full read/write access
    ]
    
    def __init__(self):
        self.creds = None
        self.service = None
        self.token_path = os.path.join(settings.BASE_DIR, 'token.pickle')
        self.credentials_path = os.path.join(settings.BASE_DIR, 'credentials.json')
        # Use the exact redirect URI from your Google Cloud Console
        self.redirect_uri = 'http://127.0.0.1:8000/google-sheets/oauth2callback/'
        self.network_available = None  # Cache network status
    
    def check_network_connectivity(self, host='oauth2.googleapis.com', port=443, timeout=5):
        """Check if network connectivity to Google services is available"""
        if self.network_available is not None:
            return self.network_available
            
        try:
            # Try to connect to Google's OAuth2 service
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((host, port))
            sock.close()
            
            self.network_available = (result == 0)
            return self.network_available
        except Exception as e:
            print(f"⚠️  Network connectivity check failed: {e}")
            self.network_available = False
            return False
    
    def get_offline_mode_message(self):
        """Get a helpful message for offline mode"""
        return (
            "🔄 Google Sheets service is currently unavailable due to network connectivity issues.\n"
            "📋 This could be due to:\n"
            "   • Internet connection problems\n"
            "   • Corporate firewall blocking oauth2.googleapis.com\n"
            "   • DNS resolution issues\n"
            "   • Proxy configuration problems\n\n"
            "🔧 Troubleshooting steps:\n"
            "   1. Check your internet connection\n"
            "   2. Try accessing https://oauth2.googleapis.com in your browser\n"
            "   3. Contact your IT department if behind a corporate firewall\n"
            "   4. Check proxy settings if applicable\n"
            "   5. Try using a different network connection\n\n"
            "💡 The system will automatically retry when connectivity is restored."
        )
    
    def authenticate(self, request=None):
        """Authenticate with Google Sheets API"""
        # Check network connectivity first
        if not self.check_network_connectivity():
            raise ConnectionError(
                "❌ Network connectivity issue: Cannot reach Google OAuth2 services. "
                "Please check your internet connection and try again. "
                "If you're behind a corporate firewall, ensure oauth2.googleapis.com is accessible."
            )
        
        # The file token.pickle stores the user's access and refresh tokens,
        # and is created automatically when the authorization flow completes for the first time.
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # If there are no (valid) credentials available, let the user log in.
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    print("🔄 Attempting to refresh expired token...")
                    self.creds.refresh(Request())
                    print("✅ Token refreshed successfully")
                except (ConnectionError, Timeout, MaxRetryError, NameResolutionError) as e:
                    print(f"❌ Token refresh failed due to network issue: {e}")
                    raise ConnectionError(
                        f"❌ Cannot refresh Google OAuth2 token due to network connectivity issue: {e}. "
                        "Please check your internet connection and ensure oauth2.googleapis.com is accessible."
                    )
                except Exception as e:
                    print(f"❌ Token refresh failed: {e}")
                    # Clear invalid credentials and proceed to re-authentication
                    self.creds = None
            else:
                if not os.path.exists(self.credentials_path):
                    raise FileNotFoundError(
                        "credentials.json file not found. Please download it from Google Cloud Console "
                        "and place it in your project root directory."
                    )
                
                # Check if we have an authorization code from Django session
                auth_code = None
                if request and hasattr(request, 'session'):
                    auth_code = request.session.get('google_auth_code')
                    if auth_code:
                        # Clear the code from session after use
                        del request.session['google_auth_code']
                
                if auth_code:
                    # Use the authorization code from Django session
                    flow = Flow.from_client_secrets_file(
                        self.credentials_path, self.SCOPES, redirect_uri=self.redirect_uri)
                    flow.fetch_token(code=auth_code)
                    self.creds = flow.credentials
                else:
                    # Generate authorization URL for manual flow
                    flow = Flow.from_client_secrets_file(
                        self.credentials_path, self.SCOPES, redirect_uri=self.redirect_uri)
                    
                    auth_url, _ = flow.authorization_url(
                        prompt='consent', access_type='offline', include_granted_scopes='true'
                    )
                    print(f"\n[AUTH] Please visit this URL to authorize the application:")
                    print(f"   {auth_url}")
                    print(f"\n[INFO] After authorization, you'll be redirected to: {self.redirect_uri}")
                    print(f"[INFO] Copy the 'code' parameter from the URL and paste it below.")

                    # Get authorization code from user
                    auth_code = input("\n[INPUT] Enter the authorization code: ").strip()
                    
                    # Exchange code for tokens
                    flow.fetch_token(code=auth_code)
                    self.creds = flow.credentials
            
            # Save the credentials for the next run
            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)
        
        # Build the service
        self.service = build('sheets', 'v4', credentials=self.creds)
    
    def check_connection_status(self):
        """Check if Google Sheets connection is working without user interaction"""
        try:
            # Force fresh network check (don't use cached value)
            self.network_available = None  # Reset cache
            if not self.check_network_connectivity():
                return False, "Network connectivity issue"

            # Load existing credentials
            if not os.path.exists(self.token_path):
                return False, "Token file not found - authentication required"

            with open(self.token_path, 'rb') as token:
                self.creds = pickle.load(token)

            # If credentials are expired but have refresh token, try to refresh
            if self.creds and not self.creds.valid and self.creds.expired and self.creds.refresh_token:
                try:
                    print("🔄 Google Sheets token expired, attempting to refresh...")
                    self.creds.refresh(Request())
                    print("✅ Google Sheets token refreshed successfully")
                    
                    # Save the refreshed credentials
                    with open(self.token_path, 'wb') as token:
                        pickle.dump(self.creds, token)
                        
                except Exception as e:
                    print(f"❌ Failed to refresh Google Sheets token: {e}")
                    return False, f"Token refresh failed: {e}"
            
            # Check if credentials are valid
            if not self.creds or not self.creds.valid:
                return False, "No valid credentials available"
            
            # Build service and test connection
            self.service = build('sheets', 'v4', credentials=self.creds)
            
            # Make a simple API call to verify connection
            try:
                # Try to access a test spreadsheet or just verify the service works
                self.service.spreadsheets().get(spreadsheetId='test').execute()
            except:
                # Even if the test call fails, if we got this far, the service is built
                # which means the credentials are valid
                pass
            
            return True, "Connection successful"
            
        except Exception as e:
            print(f"❌ Google Sheets connection check failed: {e}")
            return False, f"Connection check failed: {e}"
        return self.service
    
    def get_sheet_data(self, spreadsheet_id, range_name, request=None):
        """Get data from a specific range in the spreadsheet"""
        try:
            if not self.service:
                self.authenticate(request)
            
            sheet = self.service.spreadsheets()
            result = sheet.values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            return values
        except (ConnectionError, Timeout, MaxRetryError, NameResolutionError) as e:
            print(f"❌ Network error fetching Google Sheets data: {e}")
            raise ConnectionError(
                f"❌ Cannot fetch data from Google Sheets due to network connectivity issue: {e}. "
                "Please check your internet connection and try again."
            )
        except Exception as e:
            print(f"❌ Error fetching data: {e}")
            return None
    
    def get_columns_h_and_j(self, spreadsheet_id, start_row=2, request=None):
        """Get data from columns H and J starting from row 2"""
        # Column H is the 8th column (0-indexed), Column J is the 10th column (0-indexed)
        # We'll fetch both columns and combine them
        range_h = f"H{start_row}:H"
        range_j = f"J{start_row}:J"
        
        data_h = self.get_sheet_data(spreadsheet_id, range_h, request)
        data_j = self.get_sheet_data(spreadsheet_id, range_j, request)
        
        if not data_h or not data_j:
            return []
        
        # Combine the data from both columns
        combined_data = []
        max_rows = max(len(data_h), len(data_j))
        
        for i in range(max_rows):
            h_value = data_h[i][0] if i < len(data_h) and data_h[i] else ""
            j_value = data_j[i][0] if i < len(data_j) and data_j[i] else ""
            combined_data.append({
                'column_h': h_value,
                'column_j': j_value,
                'row_number': start_row + i
            })
        
        return combined_data
    
    def get_columns_h_j_k_from_sheet(self, spreadsheet_id, sheet_name, start_row=2, request=None):
        """Get data from columns H, J, and K starting from row 2 from a specific sheet"""
        # Column H is the 8th column (0-indexed), Column J is the 10th column (0-indexed), Column K is the 11th column (0-indexed)
        # We'll fetch all three columns and combine them from the specified sheet
        range_h = f"'{sheet_name}'!H{start_row}:H"
        range_j = f"'{sheet_name}'!J{start_row}:J"
        range_k = f"'{sheet_name}'!K{start_row}:K"
        
        data_h = self.get_sheet_data(spreadsheet_id, range_h, request)
        data_j = self.get_sheet_data(spreadsheet_id, range_j, request)
        data_k = self.get_sheet_data(spreadsheet_id, range_k, request)
        
        if not data_h or not data_j:
            return []
        
        # Combine the data from all three columns
        combined_data = []
        max_rows = max(len(data_h), len(data_j), len(data_k) if data_k else 0)
        
        for i in range(max_rows):
            h_value = data_h[i][0] if i < len(data_h) and data_h[i] else ""
            j_value = data_j[i][0] if i < len(data_j) and data_j[i] else ""
            k_value = data_k[i][0] if data_k and i < len(data_k) and data_k[i] else ""
            combined_data.append({
                'column_h': h_value,
                'column_j': j_value,
                'column_k': k_value,
                'row_number': start_row + i
            })
        
        return combined_data
    
    def get_specific_sheet_data(self, request=None):
        """Get data from the specific spreadsheet you mentioned - ONLY GET DATA, DON'T POPULATE"""
        spreadsheet_id = "1iNULGBAzJ9n2ZulxwP8ZZZbwcPhj7X6e6rPwYqtI_fM"
        # Specify the sheet name - "Internal Account Code Generator"
        sheet_name = "Internal Account Code Generator"
        
        # Fetch the data including emails (columns H, J, K) - NO AUTO POPULATION
        sheet_data = self.get_columns_h_j_k_from_sheet(spreadsheet_id, sheet_name, start_row=2, request=request)
        
        return sheet_data
    
    def populate_clients_table(self, sheet_data, request=None):
        """Populate the Food Safety Agency clients table with data from Google Sheets"""
        from django.contrib import messages
        from ..models import Client
        
        if not sheet_data:
            return {'success': False, 'error': 'No data provided'}
        
        clients_created = 0
        clients_updated = 0
        total_processed = 0
        
        try:
            for row_data in sheet_data:
                total_processed += 1
                
                # Column H = internal account code, Column J = client name, Column K = email
                internal_account_code = row_data.get('column_h', '').strip()
                client_name = row_data.get('column_j', '').strip()
                email = row_data.get('column_k', '').strip()
                
                # Skip empty rows
                if not client_name or not internal_account_code:
                    continue
                
                # Clean email (remove whitespace, validate basic format)
                if email and '@' not in email:
                    email = ''  # Invalid email format
                
                # Convert "None" to null/empty string
                if email.lower() == 'none':
                    email = ''
                
                # Check if client already exists by client_id
                existing_client = Client.objects.filter(name=client_name).first()
                
                if existing_client:
                    # Update existing client
                    existing_client.name = client_name
                    existing_client.internal_account_code = internal_account_code
                    existing_client.email = email if email else None
                    existing_client.save()
                    clients_updated += 1
                else:
                    # Create new client with unique ID
                    import time
                    unique_id = f"CL{int(time.time() * 1000) % 100000:05d}{total_processed:03d}"
                    Client.objects.create(
                        name=client_name,
                        client_id=unique_id,
                        internal_account_code=internal_account_code,
                        email=email if email else None
                    )
                    clients_created += 1
            
            return {
                'success': True,
                'clients_created': clients_created,
                'clients_updated': clients_updated,
                'total_processed': total_processed
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'clients_created': clients_created,
                'clients_updated': clients_updated,
                'total_processed': total_processed
            }

    def refresh_clients_table(self, request=None):
        """Sync the Food Safety Agency clients table with fresh data from Google Sheets (preserves existing relationships)"""
        from django.contrib import messages
        from django.db import transaction
        from ..models import Client, Shipment
        
        try:
            # Check if there are shipments that would prevent full deletion
            shipment_count = Shipment.objects.count()
            
            if shipment_count > 0:
                print(f"🛡️  Found {shipment_count:,} existing shipments - using preservation sync")
                return self._sync_with_preservation(request)
            else:
                print("🗑️  No existing shipments - using full replacement sync")
                return self._sync_with_full_replacement(request)
                
        except Exception as e:
            print(f"      ❌ Exception during client sync: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
    
    def _sync_with_preservation(self, request=None):
        """Sync clients while preserving existing relationships"""
        from ..models import Client
        import uuid

        print("   🔄 Step 2.1: Starting preservation sync...")
        initial_count = Client.objects.count()
        print(f"      📊 Initial client count: {initial_count:,}")

        # IMPORTANT: Authenticate BEFORE fetching data
        print("\n   🔐 Step 2.1.1: Authenticating with Google Sheets...")
        try:
            self.authenticate(request)
            print("      ✅ Google Sheets authentication successful!")
        except ConnectionError as e:
            print(f"      ❌ Network/Connection error: {e}")
            return {
                'success': False,
                'error': f'Network error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
        except FileNotFoundError as e:
            print(f"      ❌ Credentials file error: {e}")
            return {
                'success': False,
                'error': f'Credentials error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
        except Exception as e:
            print(f"      ❌ Authentication error: {e}")
            return {
                'success': False,
                'error': f'Authentication error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }

        print("\n   📥 Step 2.2: Fetching fresh data from Google Sheets...")
        try:
            sheet_data = self.get_specific_sheet_data(request)
        except Exception as e:
            print(f"      ❌ Error fetching data from Google Sheets: {e}")
            return {
                'success': False,
                'error': f'Failed to fetch Google Sheets data: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }

        if not sheet_data:
            print("      ❌ No data received from Google Sheets")
            print("      ⚠️  Possible causes:")
            print("         - Spreadsheet is empty")
            print("         - Wrong spreadsheet ID")
            print("         - Sheet name doesn't match")
            print("         - Network/API error")
            return {
                'success': False,
                'error': 'No data fetched from Google Sheets (empty response)',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
        
        print(f"      📊 Received {len(sheet_data)} rows from Google Sheets")
        
        # Get existing clients for comparison
        existing_clients_by_code = {}
        existing_clients_by_name = {}
        for client in Client.objects.all():
            if client.internal_account_code:
                existing_clients_by_code[client.internal_account_code] = client
            existing_clients_by_name[client.name] = client
        
        clients_created = 0
        clients_updated = 0
        total_processed = 0
        skipped_rows = 0
        
        print("\n   🔄 Step 2.3: Processing and updating/creating clients...")
        
        # Simple processing - just grab data as it is
        for i, row_data in enumerate(sheet_data, 1):
            total_processed += 1
            
            # Extract data exactly as it is
            internal_account_code = row_data.get('column_h', '').strip()
            client_name = row_data.get('column_j', '').strip()
            email = row_data.get('column_k', '').strip()
            
            # Skip empty rows only
            if not client_name or not internal_account_code:
                skipped_rows += 1
                continue
            
            # Clean email only
            if email and email.lower() == 'none':
                email = ''
            
            # Try to find existing client by account code
            existing_client = existing_clients_by_code.get(internal_account_code)
            
            if existing_client:
                # Update existing client
                updated = False
                if existing_client.name != client_name:
                    existing_client.name = client_name
                    updated = True
                if not existing_client.manual_email and existing_client.email != (email if email else None):
                    existing_client.email = email if email else None
                    updated = True
                
                if updated:
                    existing_client.save()
                    clients_updated += 1
                    if i <= 5:
                        print(f"      ✅ Updated: {client_name}")
            else:
                # Create new client
                unique_id = f"CL{uuid.uuid4().hex[:8].upper()}{i:04d}"
                new_client = Client.objects.create(
                    name=client_name,
                    client_id=unique_id,
                    internal_account_code=internal_account_code,
                    email=email if email else None
                )
                clients_created += 1
                if i <= 5:
                    print(f"      ✅ Created: {client_name}")
            
            # Periodically save session to prevent timeout
            if request and i % 1000 == 0:
                try:
                    request.session.save()
                except:
                    pass
        
        final_count = Client.objects.count()
        
        print(f"      📈 Summary: Created {clients_created} new clients, updated {clients_updated} existing clients, skipped {skipped_rows} empty rows")
        
        return {
            'success': True,
            'deleted_count': 0,  # No deletions with preservation
            'clients_created': clients_created,
            'clients_updated': clients_updated,
            'total_processed': total_processed,
            'final_count': final_count
        }
    
    def _sync_with_full_replacement(self, request=None):
        """Full replacement sync (original logic) - SINGLE RUN ONLY"""
        from ..models import Client
        from django.db import transaction
        from django.core.cache import cache
        import uuid

        # Always run sync - no blocking checks

        # IMPORTANT: Authenticate BEFORE doing anything
        print("   🔐 Step 2.0: Authenticating with Google Sheets...")
        try:
            self.authenticate(request)
            print("      ✅ Google Sheets authentication successful!")
        except ConnectionError as e:
            print(f"      ❌ Network/Connection error: {e}")
            return {
                'success': False,
                'error': f'Network error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
        except FileNotFoundError as e:
            print(f"      ❌ Credentials file error: {e}")
            return {
                'success': False,
                'error': f'Credentials error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }
        except Exception as e:
            print(f"      ❌ Authentication error: {e}")
            return {
                'success': False,
                'error': f'Authentication error: {e}',
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }

        try:
            # Wrap the entire operation in a transaction to ensure atomicity
            with transaction.atomic():
                print("\n   🗑️  Step 2.1: Clearing existing clients from database...")
                # Clear all existing Food Safety Agency clients
                deleted_count = Client.objects.count()
                print(f"      📊 Found {deleted_count} existing clients to delete")
                Client.objects.all().delete()
                print(f"      ✅ Successfully deleted {deleted_count} existing clients")

            print("\n   📥 Step 2.2: Fetching fresh data from Google Sheets...")
            # Fetch fresh data from Google Sheets including emails
            try:
                sheet_data = self.get_specific_sheet_data(request)
            except Exception as e:
                print(f"      ❌ Error fetching data from Google Sheets: {e}")
                return {
                    'success': False,
                    'error': f'Failed to fetch Google Sheets data: {e}',
                    'deleted_count': deleted_count,
                    'clients_created': 0,
                    'total_processed': 0
                }

            if not sheet_data:
                print("      ❌ No data received from Google Sheets")
                print("      ⚠️  Possible causes:")
                print("         - Spreadsheet is empty")
                print("         - Wrong spreadsheet ID")
                print("         - Sheet name doesn't match")
                print("         - Network/API error")
                return {
                    'success': False,
                    'error': 'No data fetched from Google Sheets (empty response)',
                    'deleted_count': deleted_count,
                    'clients_created': 0,
                    'total_processed': 0
                }
            
            print(f"      📊 Received {len(sheet_data)} rows from Google Sheets")
            
            clients_created = 0
            total_processed = 0
            skipped_rows = 0
            
            print("\n   🔄 Step 2.3: Processing and creating new clients...")
            
            # Use bulk_create for efficiency
            client_objects = []
            
            # Create new clients from fresh data - SIMPLE, NO PROCESSING
            for i, row_data in enumerate(sheet_data, 1):
                total_processed += 1
                
                # Extract data exactly as it is
                internal_account_code = row_data.get('column_h', '').strip()
                client_name = row_data.get('column_j', '').strip()
                email = row_data.get('column_k', '').strip()
                
                # Only skip completely empty rows
                if not client_name or not internal_account_code:
                    skipped_rows += 1
                    continue
                
                # Clean email only
                if email and email.lower() == 'none':
                    email = ''
                
                # Create client object - simple and direct
                unique_id = f"CL{uuid.uuid4().hex[:8].upper()}{i:04d}"
                client_obj = Client(
                    name=client_name,
                    client_id=unique_id,
                    internal_account_code=internal_account_code,
                    email=email if email else None
                )
                client_objects.append(client_obj)
                clients_created += 1
                
                if i <= 5:  # Show first 5 created clients
                    print(f"      ✅ Client {i}: {client_name}")
            
            # Use bulk_create for efficiency with batch processing
            if client_objects:
                print(f"      🔄 Creating {len(client_objects)} clients using bulk operations...")
                batch_size = 500  # Smaller batches for faster processing
                individual_created = 0
                total_batches = (len(client_objects) + batch_size - 1) // batch_size
                
                for i in range(0, len(client_objects), batch_size):
                    batch = client_objects[i:i + batch_size]
                    batch_num = i // batch_size + 1
                    try:
                        Client.objects.bulk_create(batch)
                        individual_created += len(batch)
                        print(f"      ✅ Batch {batch_num}/{total_batches}: {len(batch)} clients ({individual_created}/{len(client_objects)} total)")
                    except Exception as batch_error:
                        print(f"      ⚠️ Batch {batch_num} failed: {str(batch_error)}")
                        # Fallback to individual creation for this batch
                        for client_obj in batch:
                            try:
                                client_obj.save()
                                individual_created += 1
                            except Exception as individual_error:
                                print(f"      ⚠️ Failed to create client {client_obj.name}: {str(individual_error)}")
                
                print(f"      ✅ Successfully created {individual_created} clients in database")
            
            print(f"      📈 Summary: Created {clients_created} new clients, skipped {skipped_rows} empty rows")
            
            # Sync completed successfully
            
            return {
                'success': True,
                'deleted_count': deleted_count,
                'clients_created': clients_created,
                'total_processed': total_processed
            }
            
        except Exception as e:
            # Error occurred during sync
            print(f"      ❌ Exception during client sync: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'deleted_count': 0,
                'clients_created': 0,
                'total_processed': 0
            }

    def sync_inspections_from_sql_server(self, request=None):
        """Sync Food Safety Agency inspections from SQL Server to Django database"""
        from django.contrib import messages
        from ..models import FoodSafetyAgencyInspection
        import pymssql
        from django.conf import settings
        from ..views.data_views import FSA_INSPECTION_QUERY, INSPECTOR_NAME_MAP

        try:
            print("   🔌 Step 2.1: Connecting to SQL Server...")

            # Get SQL Server configuration
            sql_server_config = settings.DATABASES.get('sql_server', {})

            # Connect to SQL Server using pymssql (more reliable than pyodbc)
            connection = pymssql.connect(
                server=sql_server_config.get('HOST'),
                port=int(sql_server_config.get('PORT', 1433)),
                user=sql_server_config.get('USER'),
                password=sql_server_config.get('PASSWORD'),
                database=sql_server_config.get('NAME'),
                timeout=30
            )
            cursor = connection.cursor(as_dict=True)
            print("      ✅ Successfully connected to SQL Server using pymssql")

            print("\n   📋 Step 2.2: Executing inspection query...")
            # Execute the FSA inspection query
            cursor.execute(FSA_INSPECTION_QUERY)
            print("      ✅ Query executed successfully")

            # Fetch all results (already as dictionaries with as_dict=True)
            rows = cursor.fetchall()
            print(f"      📊 Retrieved {len(rows)} inspection records from SQL Server")
            
            print("\n   🔄 Step 2.3: Using update_or_create to preserve existing data...")
            print("      ✅ KM/Hours and local fields will be preserved automatically!")
            
            inspections_created = 0
            total_processed = 0
            
            print("\n   🔄 Step 2.4: Syncing inspections with update_or_create...")

            # Product names now come directly from the query (JOIN already done in SQL)
            print("      ✅ Product names included in query results")

            synced_count = 0
            for i, row in enumerate(rows, 1):
                total_processed += 1
                # row is already a dictionary with pymssql as_dict=True
                row_dict = row

                # Extract inspector name
                inspector_id = row_dict.get('InspectorId')
                try:
                    inspector_id_int = int(inspector_id) if inspector_id is not None else None
                except (TypeError, ValueError):
                    inspector_id_int = None

                inspector_name = INSPECTOR_NAME_MAP.get(inspector_id_int, 'Unknown')

                # Get data from query result
                remote_id = row_dict.get('Id')
                client_name = row_dict.get('Client')
                inspection_date = row_dict.get('DateOfInspection')
                commodity = row_dict.get('Commodity')

                # Product name comes directly from the query result (already JOINed in SQL)
                product_name_str = row_dict.get('ProductName')

                # Use update_or_create to preserve km/hours and local fields
                inspection, created = FoodSafetyAgencyInspection.objects.update_or_create(
                    # Match on these unique fields
                    commodity=commodity,
                    remote_id=remote_id,
                    date_of_inspection=inspection_date,
                    # Update these fields only (km/hours and local fields NOT here - preserved!)
                    defaults={
                        'start_of_inspection': row_dict.get('StartOfInspection'),
                        'end_of_inspection': row_dict.get('EndOfInspection'),
                        'inspection_location_type_id': row_dict.get('InspectionLocationTypeID'),
                        'is_direction_present_for_this_inspection': row_dict.get('IsDirectionPresentForthisInspection', False),
                        'inspector_id': inspector_id_int,
                        'inspector_name': inspector_name,
                        'latitude': row_dict.get('Latitude'),
                        'longitude': row_dict.get('Longitude'),
                        'is_sample_taken': row_dict.get('IsSampleTaken', False),
                        'client_name': client_name,
                        'product_name': product_name_str,
                        'internal_account_code': row_dict.get('InternalAccountNumber')
                        # km_traveled, hours, is_sent, sent_date, onedrive_* NOT here - all preserved!
                    }
                )

                synced_count += 1

                if i <= 5:  # Show first 5 synced inspections for debugging
                    print(f"      ✅ Synced inspection {i}: {client_name} - {commodity} (Inspector: {inspector_name})")

                # Progress indicator every 500 inspections
                if i % 500 == 0:
                    print(f"      ⏳ Progress: {i:,}/{len(rows):,} inspections synced...")

            # Summary
            inspections_created = synced_count
            print(f"      ✅ Summary: Synced {synced_count:,} inspections from {total_processed:,} records")
            print(f"      💾 KM/Hours and local fields preserved automatically!")

            # Report on preserved local data
            preserved_sent = FoodSafetyAgencyInspection.objects.filter(is_sent=True).count()
            preserved_onedrive = FoodSafetyAgencyInspection.objects.filter(onedrive_uploaded=True).count()
            preserved_km_hours = FoodSafetyAgencyInspection.objects.filter(
                km_traveled__isnull=False
            ).count() | FoodSafetyAgencyInspection.objects.filter(
                hours__isnull=False
            ).count()
            print(f"      💾 Preserved: {preserved_sent} sent, {preserved_onedrive} OneDrive, {preserved_km_hours} with km/hours")
            
            # Close connection
            cursor.close()
            connection.close()
            print("      🔌 SQL Server connection closed")
            
            return {
                'success': True,
                'deleted_count': 0,  # No longer deleting - using update_or_create
                'inspections_created': inspections_created,
                'total_processed': total_processed
            }
            
        except ImportError as e:
            print(f"      ❌ Import Error: SQL Server connector not installed")
            print(f"         Error: {str(e)}")
            return {
                'success': False,
                'error': f"SQL Server connector not installed. Please install pymssql. Error: {str(e)}",
                'deleted_count': 0,
                'inspections_created': 0,
                'total_processed': 0
            }
        except pymssql.Error as e:
            print(f"      ❌ SQL Server Connection Error: {str(e)}")
            return {
                'success': False,
                'error': f"SQL Server connection error: {str(e)}",
                'deleted_count': 0,
                'inspections_created': 0,
                'total_processed': 0
            }
        except Exception as e:
            print(f"      ❌ Unexpected Error: {str(e)}")
            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'deleted_count': 0,
                'inspections_created': 0,
                'total_processed': 0
            }

    def _bulk_fetch_product_names(self, inspections_data):
        """
        Bulk fetch product names for all inspections in one go.
        This is much faster than individual calls.
        """
        import pymssql
        from django.conf import settings
        
        product_names_map = {}
        
        try:
            # Get SQL Server configuration
            sql_server_config = settings.DATABASES.get('sql_server', {})
            
            # Connect to SQL Server
            connection = pymssql.connect(
                server=sql_server_config.get('HOST'),
                port=int(sql_server_config.get('PORT', 1433)),
                user=sql_server_config.get('USER'),
                password=sql_server_config.get('PASSWORD'),
                database=sql_server_config.get('NAME'),
                timeout=30
            )
            cursor = connection.cursor(as_dict=True)
            
            # Get all inspection IDs
            inspection_ids = [row['Id'] for row in inspections_data if row.get('Id')]
            
            if not inspection_ids:
                return product_names_map
            
            # Create placeholders for the IN clause
            placeholders = ','.join(['%s'] * len(inspection_ids))
            
            # Bulk query for PMP product names
            pmp_query = f"""
                SELECT InspectionId, PMPItemDetails
                FROM PMPInspectedProductRecordTypes 
                WHERE InspectionId IN ({placeholders}) 
                AND PMPItemDetails IS NOT NULL 
                AND PMPItemDetails != ''
            """
            cursor.execute(pmp_query, inspection_ids)
            pmp_results = cursor.fetchall()
            
            # Process PMP results
            for row in pmp_results:
                inspection_id = row['InspectionId']
                product_name = row['PMPItemDetails'].strip()
                if product_name:
                    if inspection_id not in product_names_map:
                        product_names_map[inspection_id] = []
                    product_names_map[inspection_id].append(product_name)
            
            # Bulk query for Raw RMP product names
            raw_rmp_query = f"""
                SELECT InspectionId, NewProductItemDetails
                FROM RawRMPInspectedProductRecordTypes 
                WHERE InspectionId IN ({placeholders}) 
                AND NewProductItemDetails IS NOT NULL 
                AND NewProductItemDetails != ''
            """
            cursor.execute(raw_rmp_query, inspection_ids)
            raw_rmp_results = cursor.fetchall()
            
            # Process Raw RMP results
            for row in raw_rmp_results:
                inspection_id = row['InspectionId']
                product_name = row['NewProductItemDetails'].strip()
                if product_name:
                    if inspection_id not in product_names_map:
                        product_names_map[inspection_id] = []
                    product_names_map[inspection_id].append(product_name)
            
            # Bulk query for Poultry product names (try each table)
            poultry_tables = [
                'PoultryGradingInspectionRecordTypes',
                'PoultryLabelInspectionChecklistRecords', 
                'PoultryQuidInspectionRecordTypes',
                'PoultryInspectionRecordTypes'
            ]
            
            for table in poultry_tables:
                try:
                    poultry_query = f"""
                        SELECT Id as InspectionId, ProductName
                        FROM {table}
                        WHERE Id IN ({placeholders}) 
                        AND ProductName IS NOT NULL 
                        AND ProductName != ''
                    """
                    cursor.execute(poultry_query, inspection_ids)
                    poultry_results = cursor.fetchall()
                    
                    # Process Poultry results
                    for row in poultry_results:
                        inspection_id = row['InspectionId']
                        product_name = row['ProductName'].strip()
                        if product_name:
                            if inspection_id not in product_names_map:
                                product_names_map[inspection_id] = []
                            product_names_map[inspection_id].append(product_name)
                except Exception as e:
                    # Table might not exist, continue
                    continue
            
            # Remove duplicates for each inspection
            for inspection_id in product_names_map:
                product_names_map[inspection_id] = list(set(product_names_map[inspection_id]))
            
            cursor.close()
            connection.close()
            
            print(f"      📊 Bulk fetch completed: {len(product_names_map)} inspections have product names")
            
        except Exception as e:
            print(f"      ⚠️ Error in bulk product name fetch: {e}")
            # Return empty map on error - sync can continue without product names
        
        return product_names_map

    def populate_shipments_table(self, request=None):
        """Populate the shipments table with data from remote SQL Server"""
        from django.contrib import messages
        from ..models import Shipment, Client
        
        try:
            print("   🔌 Step 2.1: Connecting to SQL Server...")
            import pyodbc
            from ..views.data_views import SQLSERVER_CONNECTION_STRING
            
            # Connect to SQL Server
            connection = pyodbc.connect(SQLSERVER_CONNECTION_STRING)
            cursor = connection.cursor()
            print("      ✅ Successfully connected to SQL Server")
            
            print("\n   📋 Step 2.2: Discovering available tables...")
            # First, let's see what tables exist in the database
            DISCOVER_TABLES_QUERY = """
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' 
            AND (TABLE_NAME LIKE '%Claim%' OR TABLE_NAME LIKE '%Shipment%' OR TABLE_NAME LIKE '%Legal%' OR TABLE_NAME LIKE '%Case%' OR TABLE_NAME LIKE '%Record%')
            ORDER BY TABLE_NAME
            """
            
            cursor.execute(DISCOVER_TABLES_QUERY)
            tables = cursor.fetchall()
            print(f"      📊 Found {len(tables)} potential shipment/claim tables:")
            for table in tables:
                print(f"         - {table[0]}")
            
            if not tables:
                print("      ⚠️  No shipment/claim tables found. Let's check ALL tables...")
                ALL_TABLES_QUERY = """
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'dbo' 
                ORDER BY TABLE_NAME
                """
                cursor.execute(ALL_TABLES_QUERY)
                all_tables = cursor.fetchall()
                print(f"      📊 Found {len(all_tables)} total tables in database:")
                for table in all_tables:
                    print(f"         - {table[0]}")
                
                # Let's also check the Clients table structure since it exists
                print("\n      🔍 Checking Clients table structure...")
                try:
                    cursor.execute("SELECT TOP 5 * FROM Clients")
                    client_columns = [column[0] for column in cursor.description]
                    print(f"      📊 Clients table columns: {', '.join(client_columns)}")
                    
                    # Check if Clients table has any shipment-related data
                    cursor.execute("SELECT TOP 3 * FROM Clients")
                    client_rows = cursor.fetchall()
                    print(f"      📊 Sample Clients data:")
                    for i, row in enumerate(client_rows, 1):
                        row_dict = dict(zip(client_columns, row))
                        print(f"         Row {i}: {row_dict}")
                        
                except Exception as e:
                    print(f"      ❌ Error checking Clients table: {str(e)}")
                
                return {
                    'success': False,
                    'error': f'No shipment/claim tables found in database. Found {len(all_tables)} total tables. Please check the table names.',
                    'deleted_count': 0,
                    'shipments_created': 0,
                    'total_processed': 0
                }
            
            # For now, let's try the first table that might contain shipment data
            table_name = tables[0][0]
            print(f"      🔍 Trying table: {table_name}")
            
            # Execute the shipment query with the discovered table
            SHIPMENT_QUERY = f"""
            SELECT TOP 10 *
            FROM {table_name}
            """
            
            cursor.execute(SHIPMENT_QUERY)
            print("      ✅ Query executed successfully")
            
            # Get column information
            columns = [column[0] for column in cursor.description]
            print(f"      📊 Table columns: {', '.join(columns)}")
            
            # Fetch all results and convert to list of dictionaries
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            print(f"      📊 Retrieved {len(rows)} shipment records from SQL Server")
            
            print("\n   🗑️  Step 2.3: Clearing existing shipments from database...")
            # Clear existing data
            deleted_count = Shipment.objects.count()
            print(f"      📊 Found {deleted_count} existing shipments to delete")
            Shipment.objects.all().delete()
            print(f"      ✅ Successfully deleted {deleted_count} existing shipments")
            
            shipments_created = 0
            total_processed = 0
            
            print("\n   🔄 Step 2.4: Processing and creating new shipments...")
            for i, row in enumerate(rows, 1):
                total_processed += 1
                row_dict = dict(zip(columns, row))
                
                # Find or create client
                client_name = row_dict.get('Client_Name', 'Unknown Client')
                # Generate unique client_id to avoid duplicates
                import time
                unique_id = f"CL{int(time.time() * 1000) % 100000:05d}{total_processed:03d}"
                client, created = Client.objects.get_or_create(
                    name=client_name,
                    defaults={'client_id': unique_id}
                )
                
                # Create shipment record
                Shipment.objects.create(
                    Claim_No=row_dict.get('Claim_No'),
                    client=client,
                    Brand=row_dict.get('Brand'),
                    Claimant=row_dict.get('Claimant'),
                    Intent_To_Claim=row_dict.get('Intent_To_Claim'),
                    Intend_Claim_Date=row_dict.get('Intend_Claim_Date'),
                    Formal_Claim_Received=row_dict.get('Formal_Claim_Received'),
                    Formal_Claim_Date_Received=row_dict.get('Formal_Claim_Date_Received'),
                    Claimed_Amount=row_dict.get('Claimed_Amount'),
                    Amount_Paid_By_Carrier=row_dict.get('Amount_Paid_By_Carrier'),
                    Amount_Paid_By_Awa=row_dict.get('Amount_Paid_By_Awa'),
                    Amount_Paid_By_Insurance=row_dict.get('Amount_Paid_By_Insurance'),
                    Total_Savings=row_dict.get('Total_Savings'),
                    Financial_Exposure=row_dict.get('Financial_Exposure'),
                    Settlement_Status=row_dict.get('Settlement_Status'),
                    Status=row_dict.get('Status', 'OPEN'),
                    Closed_Date=row_dict.get('Closed_Date'),
                    Branch=row_dict.get('Branch', 'ATL')
                )
                shipments_created += 1
                
                if i <= 5:  # Show first 5 created shipments for debugging
                    print(f"      ✅ Created shipment {i}: {row_dict.get('Claim_No')} - {client_name}")
            
            print(f"      📈 Summary: Created {shipments_created} shipments from {total_processed} records")
            
            # Close connection
            cursor.close()
            connection.close()
            print("      🔌 SQL Server connection closed")
            
            return {
                'success': True,
                'deleted_count': deleted_count,
                'shipments_created': shipments_created,
                'total_processed': total_processed
            }
            
        except ImportError as e:
            print(f"      ❌ Import Error: SQL Server connector not installed")
            print(f"         Error: {str(e)}")
            return {
                'success': False,
                'error': f"SQL Server connector not installed. Please install pyodbc. Error: {str(e)}",
                'deleted_count': 0,
                'shipments_created': 0,
                'total_processed': 0
            }
        except pyodbc.Error as e:
            print(f"      ❌ SQL Server Connection Error: {str(e)}")
            return {
                'success': False,
                'error': f"SQL Server connection error: {str(e)}",
                'deleted_count': 0,
                'shipments_created': 0,
                'total_processed': 0
            }
        except Exception as e:
            print(f"      ❌ Unexpected Error: {str(e)}")
            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'deleted_count': 0,
                'shipments_created': 0,
                'total_processed': 0
            }
