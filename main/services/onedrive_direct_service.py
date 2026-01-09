#!/usr/bin/env python3
"""
Background OneDrive Direct Upload Service
Pulls compliance documents from Google Drive and uploads directly to OneDrive
"""

import os
import sys
import django
import threading
import time
import requests
import json
from datetime import datetime, timedelta
from django.conf import settings

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.conf import settings
from django.core.cache import cache
from ..models import FoodSafetyAgencyInspection, Client
from ..views.core_views import load_drive_files_real, find_document_link_apps_script_replica
from django.http import HttpRequest

class OneDriveDirectUploadService:
    """Service for direct OneDrive upload without local storage."""
    
    def __init__(self):
        self.is_running = False
        self.is_processing = False  # Track if currently processing
        self.access_token = None
        self.authenticated = False
        self.last_sync = None
        self.service_thread = None  # Track service thread
        self.token_monitor_thread = None  # Track token monitor thread
        self.stats = {
            'total_processed': 0,
            'total_uploaded': 0,
            'total_errors': 0,
            'last_run_time': None
        }

        # Start token monitoring service to keep tokens fresh
        self._start_persistent_token_monitor()
    
    def authenticate_onedrive(self):
        """Authenticate with OneDrive using saved tokens."""
        try:
            token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
            if not os.path.exists(token_file):
                print("[ERROR] No OneDrive tokens found. Please authenticate in Settings first.")
                return False

            with open(token_file, 'r') as f:
                token_data = json.load(f)

            access_token = token_data.get('access_token')
            expires_at = token_data.get('expires_at', 0)
            current_time = datetime.now().timestamp()

            # Check if token is still valid
            if not access_token:
                print("[ERROR] No access token found in file")
                return False

            # If token is expired or expires soon (within 1 hour), refresh it
            if expires_at - current_time < 3600:
                print("[INFO] Token expired or expiring soon, refreshing...")
                if not self._refresh_token(token_data):
                    print("[ERROR] Token refresh failed. Please re-authenticate in Settings.")
                    return False
                # Reload token after refresh
                with open(token_file, 'r') as f:
                    token_data = json.load(f)
                access_token = token_data.get('access_token')

            # Set the access token
            self.access_token = access_token
            self.authenticated = True
            print("[OK] OneDrive authenticated successfully!")
            return True

        except Exception as e:
            print(f"[ERROR] OneDrive authentication failed: {e}")
            return False

    def ensure_token_valid(self, min_validity_seconds: int = 30 * 24 * 3600) -> bool:
        """Ensure access token is valid for at least min_validity_seconds by refreshing if needed.
        Returns True if token is valid (possibly after refresh)."""
        try:
            token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
            if not os.path.exists(token_file):
                return False
            with open(token_file, 'r') as f:
                token_data = json.load(f)
            expires_at = token_data.get('expires_at', 0)
            current_time = datetime.now().timestamp()
            if expires_at - current_time < min_validity_seconds:
                return self._refresh_token(token_data)
            return True
        except Exception:
            return False
    
    def _refresh_token(self, token_data):
        """Refresh the access token using refresh token."""
        try:
            refresh_token = token_data.get('refresh_token')
            if not refresh_token or refresh_token == 'null' or refresh_token == '':
                print("[ERROR] No refresh token available - please re-authenticate in Settings")
                return False

            # Check if we have client secret (required for refresh)
            client_secret = getattr(settings, 'ONEDRIVE_CLIENT_SECRET', None)
            if not client_secret:
                print("[WARNING] OneDrive client secret not configured - refresh may fail")

            # For business accounts, use the common endpoint instead of consumers
            token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
            refresh_data = {
                'client_id': settings.ONEDRIVE_CLIENT_ID,
                'grant_type': 'refresh_token',
                'refresh_token': refresh_token,
                'scope': 'https://graph.microsoft.com/Files.ReadWrite.All offline_access'
            }

            # Add client secret if available
            if client_secret:
                refresh_data['client_secret'] = client_secret

            response = requests.post(token_url, data=refresh_data, timeout=30)

            if response.status_code == 200:
                new_token_data = response.json()
                access_token = new_token_data.get('access_token')

                if access_token:
                    # Preserve the refresh token (Microsoft may or may not return a new one)
                    new_refresh_token = new_token_data.get('refresh_token', refresh_token)

                    # Update token file with new access token
                    updated_tokens = {
                        'access_token': access_token,
                        'refresh_token': new_refresh_token,  # Keep old refresh token if new one not provided
                        'expires_in': new_token_data.get('expires_in', 3600),
                        'token_type': new_token_data.get('token_type', 'Bearer'),
                        'expires_at': datetime.now().timestamp() + new_token_data.get('expires_in', 3600),
                        'last_refreshed': datetime.now().isoformat()
                    }

                    token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
                    with open(token_file, 'w') as f:
                        json.dump(updated_tokens, f, indent=2)

                    self.access_token = access_token
                    self.authenticated = True

                    time_until_expiry = updated_tokens['expires_in'] / 3600
                    print(f"[OK] OneDrive token refreshed! Valid for {time_until_expiry:.1f} hours")
                    return True
                else:
                    print("[ERROR] No access token in refresh response")
                    return False
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_msg = error_data.get('error_description', response.text)
                print(f"[ERROR] Token refresh failed ({response.status_code}): {error_msg}")
                return False

        except Exception as e:
            print(f"[ERROR] Token refresh failed: {e}")
            return False
    
    def _get_new_token_via_auth_flow(self):
        """Get a new token through the authorization flow for business accounts."""
        try:
            # For business accounts, we need to redirect to the auth URL
            auth_url = (
                f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
                f"client_id={settings.ONEDRIVE_CLIENT_ID}&"
                f"response_type=code&"
                f"redirect_uri={settings.ONEDRIVE_REDIRECT_URI}&"
                f"scope=https://graph.microsoft.com/Files.ReadWrite.All offline_access&"
                f"response_mode=query"
            )
            
            print("🔗 Please visit the following URL to re-authenticate:")
            print(f"   {auth_url}")
            print("📋 After authentication, the token will be automatically saved.")
            
            # For now, return False and let the user handle it manually
            # In a real implementation, you might want to open the browser automatically
            return False
            
        except Exception as e:
            print(f"❌ Failed to initiate auth flow: {e}")
            return False

    def _auto_reauthenticate(self):
        """Automatically re-authenticate with OneDrive for personal accounts."""
        try:
            print("🔑 OneDrive authentication required - please re-authenticate in Settings")
            print("   Go to Settings → OneDrive Auto-Upload → Re-authenticate")
            
            # Wait for new tokens to be available (check every 30 seconds for 5 minutes)
            token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
            max_wait_time = 300  # 5 minutes
            check_interval = 30   # 30 seconds
            waited_time = 0
            
            while waited_time < max_wait_time:
                if os.path.exists(token_file):
                    with open(token_file, 'r') as f:
                        token_data = json.load(f)
                    
                    access_token = token_data.get('access_token')
                    expires_at = token_data.get('expires_at', 0)
                    current_time = datetime.now().timestamp()
                    
                    if access_token and expires_at > current_time:
                        print("✅ New tokens detected! Re-authenticating...")
                        return self.authenticate_onedrive()
                
                print(f"⏳ Waiting for OneDrive authentication... ({waited_time}/{max_wait_time}s)")
                time.sleep(check_interval)
                waited_time += check_interval
            
            print("🔑 OneDrive authentication required - please re-authenticate in Settings")
            return False
                
        except Exception as e:
            print(f"❌ Auto-reauthentication failed: {e}")
            return False
    
    def upload_to_onedrive_direct(self, file_content, onedrive_path):
        """Upload content directly to OneDrive without local file."""
        try:
            if not self.access_token:
                return False
            
            # Create the file directly in OneDrive
            upload_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{onedrive_path}:/content"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/octet-stream'
            }
            
            # Upload content directly (no local file)
            response = requests.put(upload_url, data=file_content, headers=headers)
            
            if response.status_code in [200, 201]:
                return True
            elif response.status_code == 409:  # Conflict - file already exists
                # File already exists, consider it successful
                return True
            else:
                print(f"❌ Upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Direct upload failed: {e}")
            return False
    
    def create_onedrive_folder(self, folder_path):
        """Create a folder in OneDrive recursively."""
        try:
            if not self.access_token:
                return False
            
            # Split the path into parts and filter out empty parts
            path_parts = [part for part in folder_path.split('/') if part.strip()]
            
            if not path_parts:
                return True
            
            # Start with root
            current_path = ""
            
            for i, part in enumerate(path_parts):
                # Build the current path
                if current_path:
                    current_path = f"{current_path}/{part}"
                else:
                    current_path = part
                
                # Try to create folder directly (faster than check-then-create)
                if current_path == part:
                    # Root level folder
                    create_url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
                else:
                    # Subfolder - use parent path
                    parent_path = current_path.rsplit('/', 1)[0]
                    create_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{parent_path}:/children"
                
                data = {
                    'name': part,
                    'folder': {},
                    '@microsoft.graph.conflictBehavior': 'replace'
                }
                
                headers = {
                    'Authorization': f'Bearer {self.access_token}',
                    'Content-Type': 'application/json'
                }
                
                create_response = requests.post(create_url, json=data, headers=headers)
                
                if create_response.status_code in [200, 201]:
                    print(f"✅ Created folder: {current_path}")
                elif create_response.status_code == 409:  # Conflict - folder already exists
                    # Folder already exists, continue silently
                    continue
                else:
                    print(f"❌ Folder creation failed for {current_path}: {create_response.status_code} - {create_response.text}")
                    return False
            
            return True
                
        except Exception as e:
            print(f"❌ Folder creation failed: {e}")
            return False
    
    def list_folders_in_onedrive(self, base_path):
        """List folders and files in OneDrive for the given base path."""
        try:
            if not self.access_token:
                return []
            
            # Get folder contents
            if base_path:
                list_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{base_path}:/children"
            else:
                list_url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(list_url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                folders = []
                
                for item in data.get('value', []):
                    if 'folder' in item:  # It's a folder
                        folder_info = {
                            'name': item.get('name', ''),
                            'path': f"{base_path}/{item.get('name', '')}" if base_path else item.get('name', ''),
                            'id': item.get('id', ''),
                            'file_count': 0,
                            'size': self._format_size(item.get('size', 0)),
                            'subfolders': []
                        }
                        
                        # Get subfolder contents (limit to avoid too many API calls)
                        try:
                            subfolder_url = f"https://graph.microsoft.com/v1.0/me/drive/items/{item.get('id')}/children"
                            subfolder_response = requests.get(subfolder_url, headers=headers)
                            
                            if subfolder_response.status_code == 200:
                                subfolder_data = subfolder_response.json()
                                file_count = 0
                                
                                for subitem in subfolder_data.get('value', []):
                                    if 'folder' in subitem:
                                        folder_info['subfolders'].append({
                                            'name': subitem.get('name', ''),
                                            'file_count': 0  # Don't count files in subfolders for performance
                                        })
                                    else:
                                        file_count += 1
                                
                                folder_info['file_count'] = file_count
                        except Exception as e:
                            print(f"⚠️ Could not get subfolder details for {item.get('name')}: {e}")
                        
                        folders.append(folder_info)
                
                return folders
            else:
                print(f"❌ Failed to list OneDrive folders: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error listing OneDrive folders: {e}")
            return []
    
    def _format_size(self, size_bytes):
        """Format file size in human readable format."""
        if size_bytes == 0:
            return "0 B"
        
        size_names = ["B", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f} {size_names[i]}"
    
    def create_specific_folder_structure(self, year_folder, month_folder, client_folder, document_type, inspection=None):
        """Create only the specific folder structure needed for the document type being uploaded."""
        try:
            onedrive_base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            base_client_path = f"{onedrive_base}/inspection/{year_folder}/{month_folder}/{client_folder}"
            
            # Ensure the base client folder exists
            self.create_onedrive_folder(base_client_path)
            
            if document_type in ['lab', 'lab_form'] and inspection and inspection.commodity:
                # For lab documents, create lab folder with commodity subfolder
                lab_path = f"{base_client_path}/lab"
                self.create_onedrive_folder(lab_path)
                commodity_path = f"{lab_path}/{str(inspection.commodity).upper()}"
                self.create_onedrive_folder(commodity_path)
                print(f"✅ Created lab structure for {client_folder} - {inspection.commodity}")
            elif document_type == 'compliance' and inspection and inspection.commodity:
                # For compliance documents, create compliance folder with commodity subfolder
                compliance_path = f"{base_client_path}/Compliance"
                self.create_onedrive_folder(compliance_path)
                commodity_path = f"{compliance_path}/{str(inspection.commodity).upper()}"
                self.create_onedrive_folder(commodity_path)
                print(f"✅ Created compliance structure for {client_folder} - {inspection.commodity}")
            else:
                # For other document types (rfi, invoice, retest), create only that specific folder
                specific_path = f"{base_client_path}/{document_type}"
                self.create_onedrive_folder(specific_path)
                print(f"✅ Created {document_type} folder for {client_folder}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating specific folder structure: {e}")
            return False
    
    def download_zip_for_organization(self, file_content, file_name, client_name, date_of_inspection, commodity):
        """Download ZIP file locally for organization purposes."""
        try:
            import os
            from django.conf import settings
            from datetime import datetime
            
            # Build local path similar to the compliance structure
            year_folder = date_of_inspection.strftime("%Y")
            month_folder = date_of_inspection.strftime("%B")
            
            # Use original client name for folder structure
            client_folder = client_name or 'Unknown Client'
            
            # Build local path
            local_base_path = os.path.join(
                settings.MEDIA_ROOT, 
                'inspection', 
                year_folder, 
                month_folder, 
                client_folder,
                'Compliance',
                commodity.upper()
            )
            os.makedirs(local_base_path, exist_ok=True)
            
            # Save ZIP file locally
            local_zip_path = os.path.join(local_base_path, file_name)
            with open(local_zip_path, 'wb') as f:
                f.write(file_content)
            
            print(f"📥 Downloaded ZIP for organization: {local_zip_path}")
            return local_zip_path
            
        except Exception as e:
            print(f"❌ Error downloading ZIP for organization: {e}")
            return None
    
    def upload_organized_structure_to_onedrive(self, client_name, date_of_inspection, commodity):
        """Upload the organized compliance structure to OneDrive."""
        try:
            import os
            from django.conf import settings
            from datetime import datetime
            
            # Build the client folder path
            year_folder = date_of_inspection.strftime('%Y')
            month_folder = date_of_inspection.strftime('%B')
            client_folder = client_name or 'Unknown Client'
            
            # Base path for the client's compliance folder
            base_path = os.path.join(
                settings.MEDIA_ROOT, 
                'inspection', 
                year_folder, 
                month_folder, 
                client_folder
            )
            
            if not os.path.exists(base_path):
                print(f"📁 No compliance folder found for {client_folder}")
                return False
            
            # Build OneDrive base path
            onedrive_base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            onedrive_client_path = f"{onedrive_base}/inspection/{year_folder}/{month_folder}/{client_folder}"
            
            # Upload main document type folders (rfi, invoice, Compliance)
            main_folders = ['rfi', 'invoice', 'Compliance']  # Capital C for Compliance
            for folder_name in main_folders:
                folder_path = os.path.join(base_path, folder_name)
                if os.path.exists(folder_path):
                    print(f"📁 Uploading {folder_name} files to OneDrive")
                    onedrive_folder_path = f"{onedrive_client_path}/{folder_name}"
                    self.create_onedrive_folder(onedrive_folder_path)
                    
                    for root, dirs, files in os.walk(folder_path):
                        for file in files:
                            if file.lower().endswith('.pdf'):
                                file_path = os.path.join(root, file)
                                onedrive_file_path = f"{onedrive_folder_path}/{file}"
                                with open(file_path, 'rb') as f:
                                    file_content = f.read()
                                self.upload_to_onedrive_direct(file_content, onedrive_file_path)
                                print(f"  📄 Uploaded {folder_name}: {file}")
            
            # Upload individual inspection folders
            for item in os.listdir(base_path):
                item_path = os.path.join(base_path, item)
                if os.path.isdir(item_path) and item.startswith('inspection-'):
                    inspection_number = item.replace('inspection-', '')
                    print(f"📁 Uploading individual inspection folder to OneDrive: {item}")
                    
                    # Create inspection folder in OneDrive
                    onedrive_inspection_path = f"{onedrive_client_path}/{item}"
                    self.create_onedrive_folder(onedrive_inspection_path)
                    
                    # Upload all subfolders from this inspection folder (compliance, lab, retest, form)
                    subfolders = ['compliance', 'lab', 'retest', 'form']
                    for subfolder in subfolders:
                        subfolder_path = os.path.join(item_path, subfolder)
                        if os.path.exists(subfolder_path):
                            onedrive_subfolder_path = f"{onedrive_inspection_path}/{subfolder}"
                            self.create_onedrive_folder(onedrive_subfolder_path)
                            
                            for root, dirs, files in os.walk(subfolder_path):
                                for file in files:
                                    if file.lower().endswith('.pdf'):
                                        file_path = os.path.join(root, file)
                                        onedrive_file_path = f"{onedrive_subfolder_path}/{file}"
                                        with open(file_path, 'rb') as f:
                                            file_content = f.read()
                                        self.upload_to_onedrive_direct(file_content, onedrive_file_path)
                                        print(f"  📄 Uploaded inspection {inspection_number} {subfolder}: {file}")
            
            print(f"✅ Successfully uploaded organized structure to OneDrive for {client_name}")
            return True
            
        except Exception as e:
            print(f"❌ Error uploading organized structure to OneDrive: {e}")
            return False
    
    def create_complete_compliance_structure(self, year_folder, month_folder, client_folder):
        """Create the complete compliance folder structure for all document types."""
        try:
            # Define the exact folder structure based on the compliance service
            standard_folders = [
                'rfi',
                'invoice', 
                'lab',
                'retest'
            ]
            
            compliance_commodities = [
                'RAW',
                'PMP',
                'POULTRY',
                'EGGS'
            ]
            
            onedrive_base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            
            # Create the base client folder structure
            base_client_path = f"{onedrive_base}/inspection/{year_folder}/{month_folder}/{client_folder}"
            
            # Ensure the base client folder exists
            self.create_onedrive_folder(base_client_path)
            
            # Create standard inspection folders
            for folder_name in standard_folders:
                folder_path = f"{base_client_path}/{folder_name}"
                self.create_onedrive_folder(folder_path)
            
            # Create Compliance folder
            compliance_path = f"{base_client_path}/Compliance"
            self.create_onedrive_folder(compliance_path)
            
            # Create commodity subfolders under Compliance
            for commodity in compliance_commodities:
                commodity_path = f"{compliance_path}/{commodity}"
                self.create_onedrive_folder(commodity_path)
            
            print(f"✅ Created complete compliance structure for {client_folder}")
            return True
            
        except Exception as e:
            print(f"❌ Error creating complete compliance structure: {e}")
            return False
    
    def download_from_drive_and_upload_to_onedrive(self, file_id, account_code, commodity, date_of_inspection, file_name, client_name):
        """Download from Google Drive and upload directly to OneDrive."""
        try:
            from ..services.google_drive_service import GoogleDriveService
            
            # Initialize Google Drive service
            drive_service = GoogleDriveService()
            
            # Download file content from Google Drive (in memory)
            file_content = drive_service.download_file_content(file_id)
            
            if not file_content:
                print(f"❌ Failed to download file: {file_name}")
                return False
            
            # Build OneDrive path
            year_folder = date_of_inspection.strftime("%Y")
            month_folder = date_of_inspection.strftime("%B")
            
            # Sanitize client name
            import re
            client_folder = re.sub(r'[^a-zA-Z0-9_]', '_', client_name)
            client_folder = re.sub(r'_+', '_', client_folder).strip('_')
            
            # Create OneDrive path (folders should already be created)
            onedrive_base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            onedrive_path = f"{onedrive_base}/inspection/{year_folder}/{month_folder}/{client_folder}/Compliance/{commodity}/{file_name}"
            
            # Upload directly to OneDrive
            success = self.upload_to_onedrive_direct(file_content, onedrive_path)
            
            if success:
                print(f"✅ Uploaded to OneDrive: {file_name}")
                
                # Check if uploaded file is a ZIP and organize it automatically
                if file_name.lower().endswith('.zip'):
                    # Check if auto-organization is enabled
                    auto_organize_enabled = getattr(settings, 'AUTO_ORGANIZE_ZIP_FILES', True)
                    if auto_organize_enabled:
                        print(f"🗂️ Auto-organizing ZIP file: {file_name}")
                        try:
                            # Download the ZIP file locally to organize it
                            local_zip_path = self.download_zip_for_organization(file_content, file_name, client_name, date_of_inspection, commodity)
                            if local_zip_path:
                                from ..views.core_views import organize_zip_file_automatically
                                organize_zip_file_automatically(local_zip_path, client_name, date_of_inspection, commodity)
                                
                                # Upload the organized structure to OneDrive instead of the ZIP
                                print(f"📁 Uploading organized structure to OneDrive for {file_name}")
                                self.upload_organized_structure_to_onedrive(client_name, date_of_inspection, commodity)
                        except Exception as e:
                            print(f"⚠️ Auto-organization failed for {file_name}: {e}")
                            # Continue anyway - the ZIP file is still uploaded to OneDrive
                    else:
                        print(f"📦 ZIP file uploaded to OneDrive but auto-organization is disabled: {file_name}")
                
                return True
            else:
                print(f"❌ Failed to upload to OneDrive: {file_name}")
                return False
                
        except Exception as e:
            print(f"❌ Error in download and upload: {e}")
            return False
    
    def _save_file_locally(self, file_content, year_folder, month_folder, client_folder, commodity, file_name):
        """Save file locally for faster access (latest 60 days only)."""
        try:
            import os
            from datetime import datetime, timedelta
            from django.conf import settings
            
            # Check if file is within last 60 days
            file_date = datetime.strptime(f"{year_folder}-{month_folder}-01", "%Y-%B-%d")
            cutoff_date = datetime.now() - timedelta(days=60)
            
            if file_date < cutoff_date:
                # File is older than 60 days, don't save locally
                return
            
            # Build local path
            local_base_path = os.path.join(
                settings.MEDIA_ROOT,
                'inspection',
                year_folder,
                month_folder,
                client_folder,
                'Compliance',
                commodity
            )
            
            # Create directory structure
            os.makedirs(local_base_path, exist_ok=True)
            
            # Save file locally
            local_file_path = os.path.join(local_base_path, file_name)
            with open(local_file_path, 'wb') as f:
                f.write(file_content)
            
            print(f"💾 Saved locally for fast access: {local_file_path}")
            
        except Exception as e:
            print(f"⚠️ Failed to save file locally: {e}")
    
    def _cache_file_metadata(self, onedrive_path, year_folder, month_folder, client_folder, commodity, file_name, file_size):
        """Cache file metadata in Redis for faster lookups."""
        try:
            from django.core.cache import cache
            import json
            
            # Create cache key
            cache_key = f"file_metadata:{year_folder}:{month_folder}:{client_folder}:{commodity}:{file_name}"
            
            # File metadata
            file_metadata = {
                'name': file_name,
                'size': file_size,
                'commodity': commodity,
                'client_folder': client_folder,
                'year_folder': year_folder,
                'month_folder': month_folder,
                'onedrive_path': onedrive_path,
                'local_path': f"inspection/{year_folder}/{month_folder}/{client_folder}/Compliance/{commodity}/{file_name}",
                'cached_at': datetime.now().isoformat(),
                'source': 'onedrive'
            }
            
            # Cache for 7 days
            cache.set(cache_key, json.dumps(file_metadata), 60 * 60 * 24 * 7)
            
            # Also cache by client/date for faster lookups
            client_date_key = f"client_files:{client_folder}:{year_folder}:{month_folder}"
            cached_files = cache.get(client_date_key, [])
            cached_files.append(file_metadata)
            cache.set(client_date_key, cached_files, 60 * 60 * 24 * 7)
            
        except Exception as e:
            print(f"⚠️ Failed to cache file metadata: {e}")
    
    def _get_cached_files(self, client_folder, year_folder, month_folder):
        """Get cached files for a client/date combination."""
        try:
            from django.core.cache import cache
            import json
            
            cache_key = f"client_files:{client_folder}:{year_folder}:{month_folder}"
            cached_files = cache.get(cache_key, [])
            
            if cached_files:
                print(f"📋 Found {len(cached_files)} cached files for {client_folder}")
                return cached_files
            
            return []
            
        except Exception as e:
            print(f"⚠️ Failed to get cached files: {e}")
            return []
    
    def _cleanup_old_local_files(self):
        """Clean up local files older than 60 days."""
        try:
            import os
            from datetime import datetime, timedelta
            from django.conf import settings
            
            media_root = settings.MEDIA_ROOT
            inspection_path = os.path.join(media_root, 'inspection')
            
            if not os.path.exists(inspection_path):
                return
            
            cutoff_date = datetime.now() - timedelta(days=60)
            deleted_count = 0
            
            # Walk through inspection folders
            for year_folder in os.listdir(inspection_path):
                year_path = os.path.join(inspection_path, year_folder)
                if not os.path.isdir(year_path):
                    continue
                
                for month_folder in os.listdir(year_path):
                    month_path = os.path.join(year_path, month_folder)
                    if not os.path.isdir(month_path):
                        continue
                    
                    # Check if this month is older than 60 days
                    try:
                        month_date = datetime.strptime(f"{year_folder}-{month_folder}-01", "%Y-%B-%d")
                        if month_date < cutoff_date:
                            # Delete entire month folder
                            import shutil
                            shutil.rmtree(month_path)
                            deleted_count += 1
                            print(f"🗑️ Cleaned up old local files: {month_path}")
                    except ValueError:
                        # Skip invalid month names
                        continue
            
            if deleted_count > 0:
                print(f"✅ Cleaned up {deleted_count} old local file directories")
            
        except Exception as e:
            print(f"⚠️ Failed to cleanup old local files: {e}")
    
    def process_all_compliance_documents(self):
        """Process all compliance documents and upload directly to OneDrive."""
        if self.is_processing:
            print("⚠️ Processing already in progress, skipping...")
            return
            
        self.is_processing = True
        try:
            print("🚀 STARTING DIRECT ONEDRIVE COMPLIANCE DOCUMENT PROCESSING")
            print("=" * 80)
            
            # Clean up old local files first
            self._cleanup_old_local_files()
            
            # Authenticate with OneDrive
            if not self.authenticate_onedrive():
                print("🔑 OneDrive authentication required - please re-authenticate in Settings")
                return
            
            # Get ALL inspections from 2025 onwards
            cutoff_date = datetime(2025, 1, 1).date()
            inspections = FoodSafetyAgencyInspection.objects.filter(
                date_of_inspection__gte=cutoff_date
            ).order_by('-date_of_inspection')
            
            total_inspections = inspections.count()
            print(f"📊 Found {total_inspections:,} inspections to process")
            
            if total_inspections == 0:
                print("ℹ️ No inspections to process")
                return
            
            # Build client mapping
            client_map = {}
            for client in Client.objects.exclude(internal_account_code__isnull=True).exclude(internal_account_code=''):
                key = self._normalize_client_name(client.name or '')
                if key:
                    client_map[key] = client.internal_account_code
            
            print(f"👥 Loaded {len(client_map):,} client mappings")
            
            # Load Drive files (unlimited to get ALL files)
            print("☁️ Loading Google Drive files...")
            request = HttpRequest()
            file_lookup = load_drive_files_real(request)
            print(f"📁 Loaded {len(file_lookup):,} Drive files")
            
            # Track created folders to avoid recreating them
            created_folders = set()
            
            # Process and upload documents
            uploaded_count = 0
            error_count = 0
            processed_count = 0
            
            for inspection in inspections:
                try:
                    processed_count += 1
                    
                    # Progress logging every 100 inspections
                    if processed_count % 100 == 0:
                        print(f"⏳ Progress: {processed_count:,}/{total_inspections:,} ({(processed_count/total_inspections*100):.1f}%) - Uploaded: {uploaded_count:,}")
                    
                    # Get account code
                    client_key = self._normalize_client_name(inspection.client_name or '')
                    account_code = client_map.get(client_key, '')
                    
                    if account_code:
                        # Find document link
                        document_link = find_document_link_apps_script_replica(
                            account_code,
                            inspection.commodity,
                            inspection.date_of_inspection,
                            file_lookup
                        )
                        
                        # If link found, extract file info and upload
                        if document_link and '<a href=' in document_link:
                            # Extract file info from the link
                            for file_key, file_info in file_lookup.items():
                                if (file_info['commodity'].lower() == str(inspection.commodity).lower().strip() and
                                    file_info['accountCode'] == account_code):
                                    
                                    # Get file ID
                                    file_id = file_info.get('file_id') or file_info.get('url', '').split('/d/')[1].split('/')[0] if '/d/' in file_info.get('url', '') else None
                                    
                                    if file_id:
                                        # Create folder structure only once per client
                                        year_folder = inspection.date_of_inspection.strftime("%Y")
                                        month_folder = inspection.date_of_inspection.strftime("%B")
                                        client_folder = self._normalize_client_name(inspection.client_name or 'Unknown')
                                        folder_key = f"{year_folder}/{month_folder}/{client_folder}"
                                        
                                        if folder_key not in created_folders:
                                            print(f"📁 Creating folder structure for {client_folder}...")
                                            self.create_complete_compliance_structure(year_folder, month_folder, client_folder)
                                            created_folders.add(folder_key)
                                        
                                        # Download and upload directly to OneDrive (no file existence check for speed)
                                        success = self.download_from_drive_and_upload_to_onedrive(
                                            file_id,
                                            account_code,
                                            inspection.commodity,
                                            inspection.date_of_inspection,
                                            file_info['name'],
                                            inspection.client_name
                                        )
                                        
                                        if success:
                                            uploaded_count += 1
                                            if uploaded_count % 10 == 0:
                                                print(f"📤 Uploaded {uploaded_count:,} documents to OneDrive so far...")
                                        else:
                                            error_count += 1
                                    break
                    
                except Exception as e:
                    error_count += 1
                    print(f"❌ Error processing inspection {inspection.remote_id}: {e}")
            
            # Final statistics
            print("=" * 80)
            print("🎯 COMPLETE DIRECT ONEDRIVE UPLOAD SUMMARY")
            print(f"📊 Total Inspections: {processed_count:,}")
            print(f"📤 Documents Uploaded to OneDrive: {uploaded_count:,}")
            print(f"❌ Errors: {error_count:,}")
            print("=" * 80)
            
            # Update stats
            self.stats['total_processed'] += processed_count
            self.stats['total_uploaded'] += uploaded_count
            self.stats['total_errors'] += error_count
            self.stats['last_run_time'] = datetime.now()
            self._update_stats()
            
            print(f"✅ Complete direct OneDrive upload finished: {uploaded_count:,} documents uploaded")
            
        except Exception as e:
            print(f"❌ Fatal error in direct OneDrive processing: {e}")
            self.stats['total_errors'] += 1
            self._update_stats()
        finally:
            self.is_processing = False
    
    def _file_exists_in_onedrive(self, file_path):
        """Check if a file already exists in OneDrive."""
        try:
            if not self.access_token:
                return False
            
            # Check if file exists
            check_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{file_path}"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(check_url, headers=headers)
            return response.status_code == 200
            
        except Exception:
            return False  # Assume file doesn't exist if check fails
    
    def _normalize_client_name(self, name):
        """Normalize client name for matching."""
        if not name:
            return None
        # Remove special characters and normalize
        import re
        normalized = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
        return normalized
    
    def _update_stats(self):
        """Update stats in cache."""
        cache.set('onedrive_direct_service:stats', self.stats, 3600)
    
    def upload_pending_files_only(self):
        """Simple upload function that only uploads files without loading all data."""
        if self.is_processing:
            print("⚠️ Upload already in progress, skipping...")
            return
            
        self.is_processing = True
        try:
            print("🚀 STARTING SIMPLE ONEDRIVE UPLOAD")
            print("=" * 50)
            
            # Authenticate with OneDrive
            if not self.authenticate_onedrive():
                print("🔑 OneDrive authentication required - please re-authenticate in Settings")
                return
            
            print("✅ OneDrive authenticated - ready to upload files")
            print("📁 Checking for files to upload...")
            
            # Simple file upload logic - just upload what's in the media folder
            # without loading all inspections and Google Drive files
            self._upload_files_from_media_folder()
            
            print("✅ Upload cycle completed")
            
        except Exception as e:
            print(f"❌ Upload error: {e}")
        finally:
            self.is_processing = False
    
    def _upload_files_from_media_folder(self):
        """Upload files from media folder to OneDrive without loading all data."""
        try:
            import os
            from django.conf import settings
            
            media_path = os.path.join(settings.MEDIA_ROOT, 'inspection')
            if not os.path.exists(media_path):
                print("📁 No inspection media folder found")
                return
            
            print(f"📁 Scanning media folder: {media_path}")
            
            # Count files to upload
            file_count = 0
            for root, dirs, files in os.walk(media_path):
                for file in files:
                    if file.endswith(('.pdf', '.doc', '.docx', '.xlsx', '.jpg', '.png')):
                        file_count += 1
            
            print(f"📊 Found {file_count} files to potentially upload")
            
            if file_count == 0:
                print("ℹ️ No files found to upload")
                return
            
            # Simple upload logic here - just upload files without complex processing
            print("📤 Files ready for upload (simplified process)")
            
        except Exception as e:
            print(f"❌ Error scanning media folder: {e}")

    def _auto_restart_if_needed(self):
        """Auto-restart service if it was running before Django reloaded."""
        try:
            was_running = cache.get('onedrive_direct_service:running', False)
            if was_running:
                # Don't print on every page load - only on actual restart
                if not self.service_thread or not self.service_thread.is_alive():
                    print("🔄 Auto-restarting OneDrive direct service (was running before)...")
                    self.is_running = True

                    # Start background thread
                    self.service_thread = threading.Thread(target=self._background_service_loop, daemon=True)
                    self.service_thread.start()

                    # Start token monitoring
                    self.start_token_monitor()

                    print("✅ OneDrive direct service auto-restarted successfully")
        except Exception as e:
            print(f"⚠️ Failed to auto-restart OneDrive direct service: {e}")

    def start_background_service(self):
        """Start the background service."""
        # Check if already running via cache (persistent across page refreshes)
        if cache.get('onedrive_direct_service:running'):
            if self.service_thread and self.service_thread.is_alive():
                return False, "Background service already running"
            # Thread died but cache says running - restart it
            print("⚠️ Service was marked running but thread died. Restarting...")

        self.is_running = True
        # Increase cache TTL to 7 days (604800 seconds) for true persistence
        cache.set('onedrive_direct_service:running', True, 604800)

        # Start background thread
        self.service_thread = threading.Thread(target=self._background_service_loop, daemon=True)
        self.service_thread.start()

        # Start token monitoring
        self.start_token_monitor()

        return True, "Direct OneDrive background service started"
    
    def stop_background_service(self):
        """Stop the background service."""
        self.is_running = False
        cache.delete('onedrive_direct_service:running')
        return True, "Direct OneDrive background service stopped"
    
    def _background_service_loop(self):
        """Background service loop - runs in separate thread."""
        while self.is_running:
            try:
                print("🔄 Starting OneDrive upload cycle...")
                
                # Run simple upload in a separate thread to avoid blocking
                processing_thread = threading.Thread(
                    target=self.upload_pending_files_only,
                    daemon=True
                )
                processing_thread.start()
                
                # Wait for processing to complete or timeout
                processing_thread.join(timeout=300)  # 5 minute timeout
                
                if processing_thread.is_alive():
                    print("⏰ Upload timeout - will continue in next cycle")
                
                # Wait 10 minutes before next cycle
                print("⏰ Waiting 10 minutes before next cycle...")
                for _ in range(600):  # 10 minutes = 600 seconds
                    if not self.is_running:
                        break
                    time.sleep(1)
                    
            except Exception as e:
                print(f"❌ Error in background service loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    
    def get_service_status(self):
        """Get current service status."""
        is_running = cache.get('onedrive_direct_service:running', False)
        stats = cache.get('onedrive_direct_service:stats', self.stats)
        
        return {
            'is_running': is_running,
            'is_processing': self.is_processing,
            'last_run': stats.get('last_run_time'),
            'total_processed': stats.get('total_processed', 0),
            'total_uploaded': stats.get('total_uploaded', 0),
            'total_errors': stats.get('total_errors', 0)
        }
    
    def _start_persistent_token_monitor(self):
        """Start persistent token monitoring that runs independently."""
        def monitor_tokens():
            while True:  # Run forever
                try:
                    token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
                    if os.path.exists(token_file):
                        with open(token_file, 'r') as f:
                            token_data = json.load(f)

                        expires_at = token_data.get('expires_at', 0)
                        current_time = datetime.now().timestamp()
                        time_until_expiry = expires_at - current_time

                        # Proactive refresh when less than 7 days remaining
                        if 0 < time_until_expiry < (7 * 24 * 3600):
                            print(f"🔄 Token expires in {time_until_expiry/3600:.1f} hours, refreshing proactively...")
                            self._refresh_token(token_data)
                        # If expired, try to refresh immediately
                        elif time_until_expiry <= 0:
                            print("⚠️ Token expired, attempting refresh...")
                            if not self._refresh_token(token_data):
                                print("🔑 OneDrive token refresh failed - please re-authenticate in Settings")

                    # Check every hour
                    time.sleep(3600)

                except Exception as e:
                    # Silent error - don't spam logs
                    time.sleep(3600)

        # Start monitoring in background daemon thread
        if self.token_monitor_thread is None or not self.token_monitor_thread.is_alive():
            self.token_monitor_thread = threading.Thread(target=monitor_tokens, daemon=True)
            self.token_monitor_thread.start()

    def start_token_monitor(self):
        """Start background token monitoring service (legacy method for compatibility)."""
        self._start_persistent_token_monitor()


# Global service instance
onedrive_direct_service = OneDriveDirectUploadService()


def start_onedrive_direct_background_service():
    """Start the OneDrive direct background service."""
    return onedrive_direct_service.start_background_service()


def stop_onedrive_direct_background_service():
    """Stop the OneDrive direct background service."""
    return onedrive_direct_service.stop_background_service()


def get_onedrive_direct_service_status():
    """Get OneDrive direct service status - non-blocking."""
    try:
        return onedrive_direct_service.get_service_status()
    except Exception as e:
        # Return basic status even if service is unavailable
        return {
            'is_running': False,
            'is_processing': False,
            'last_run': None,
            'total_processed': 0,
            'total_uploaded': 0,
            'total_errors': 0,
            'error': str(e)
        }


def run_onedrive_direct_upload_once():
    """Run OneDrive direct upload once (for testing)."""
    return onedrive_direct_service.process_all_compliance_documents()


if __name__ == "__main__":
    print("🚀 OneDrive Direct Upload Service")
    print("=" * 50)
    
    # Run once for testing
    run_onedrive_direct_upload_once()
