import os
import logging
import requests
import json
from django.conf import settings
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OneDriveService:
    """Service for uploading files to OneDrive using Microsoft Graph API."""
    
    def __init__(self):
        self.access_token = None
        self.authenticated = False
        self.base_url = "https://graph.microsoft.com/v1.0"
        
    def authenticate(self):
        """Authenticate with Microsoft Graph API using client credentials flow."""
        try:
            if not getattr(settings, 'ONEDRIVE_ENABLED', False):
                logger.warning("OneDrive integration is disabled")
                return False
            
            # For personal OneDrive, we need to use device code flow
            # This is simpler than client credentials for personal accounts
            return self._authenticate_device_code()
            
        except Exception as e:
            logger.error(f"OneDrive authentication failed: {e}")
            return False
    
    def _authenticate_device_code(self):
        """Authenticate using device code flow for personal OneDrive."""
        try:
            # Device code flow for personal accounts
            device_code_url = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode"
            
            device_code_data = {
                'client_id': settings.ONEDRIVE_CLIENT_ID,
                'scope': 'Files.ReadWrite.All'
            }
            
            response = requests.post(device_code_url, data=device_code_data)
            if response.status_code != 200:
                logger.error(f"Device code request failed: {response.text}")
                return False
            
            device_code_response = response.json()
            device_code = device_code_response.get('device_code')
            user_code = device_code_response.get('user_code')
            verification_uri = device_code_response.get('verification_uri')
            expires_in = device_code_response.get('expires_in', 900)
            
            print(f"\n🔐 OneDrive Authentication Required")
            print(f"📱 Go to: {verification_uri}")
            print(f"🔢 Enter code: {user_code}")
            print(f"⏰ Code expires in: {expires_in} seconds")
            print(f"⏳ Waiting for authentication...")
            
            # Poll for token
            token_url = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token"
            token_data = {
                'client_id': settings.ONEDRIVE_CLIENT_ID,
                'grant_type': 'device_code',
                'device_code': device_code
            }
            
            # Poll every 5 seconds
            for _ in range(expires_in // 5):
                response = requests.post(token_url, data=token_data)
                if response.status_code == 200:
                    token_response = response.json()
                    self.access_token = token_response.get('access_token')
                    if self.access_token:
                        self.authenticated = True
                        print("✅ OneDrive authentication successful!")
                        return True
                elif response.status_code == 400:
                    error_response = response.json()
                    error = error_response.get('error')
                    if error == 'authorization_pending':
                        # Still waiting for user to authenticate
                        pass
                    elif error == 'authorization_declined':
                        logger.error("User declined authorization")
                        return False
                    elif error == 'expired_token':
                        logger.error("Device code expired")
                        return False
                    else:
                        logger.error(f"Authentication error: {error}")
                        return False
                
                import time
                time.sleep(5)
            
            logger.error("Authentication timed out")
            return False
            
        except Exception as e:
            logger.error(f"Device code authentication failed: {e}")
            return False
    
    def upload_file(self, local_file_path, onedrive_path):
        """Upload a file to OneDrive."""
        try:
            if not self.authenticated:
                if not self.authenticate():
                    return False
            
            # Create the file in OneDrive
            upload_url = f"{self.base_url}/me/drive/root:/{onedrive_path}:/content"
            
            with open(local_file_path, 'rb') as file:
                headers = {
                    'Authorization': f'Bearer {self.access_token}',
                    'Content-Type': 'application/octet-stream'
                }
                
                response = requests.put(upload_url, data=file, headers=headers)
                
                if response.status_code in [200, 201]:
                    logger.info(f"File uploaded successfully: {onedrive_path}")
                    return True
                else:
                    logger.error(f"Upload failed: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return False
    
    def create_folder(self, folder_path):
        """Create a folder in OneDrive."""
        try:
            if not self.authenticated:
                if not self.authenticate():
                    return False
            
            # Create folder
            create_url = f"{self.base_url}/me/drive/root:/{folder_path}:/children"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'name': os.path.basename(folder_path),
                'folder': {},
                '@microsoft.graph.conflictBehavior': 'replace'
            }
            
            response = requests.post(create_url, json=data, headers=headers)
            
            if response.status_code in [200, 201]:
                return True
            elif response.status_code == 409:
                # Folder already exists
                return True
            else:
                logger.error(f"Folder creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Folder creation failed: {e}")
            return False
    
    def sync_file_to_onedrive(self, local_file_path, onedrive_folder=None):
        """Sync a local file to OneDrive."""
        try:
            # Use default folder from settings if not specified
            if onedrive_folder is None:
                onedrive_folder = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            
            # Build OneDrive path
            relative_path = os.path.relpath(local_file_path, settings.MEDIA_ROOT)
            onedrive_path = f"{onedrive_folder}/{relative_path}"
            
            # Ensure folder exists
            folder_path = os.path.dirname(onedrive_path)
            self.create_folder(folder_path)
            
            # Upload file
            return self.upload_file(local_file_path, onedrive_path)
            
        except Exception as e:
            logger.error(f"OneDrive sync failed: {e}")
            return False
