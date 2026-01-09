import os
import re
import pickle
from datetime import datetime
from typing import Dict, List, Optional

from django.conf import settings

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


class GoogleDriveService:
    """Service class for interacting with Google Drive API (read-only)."""

    SCOPES = [
        'https://www.googleapis.com/auth/drive.readonly'
    ]

    def __init__(self):
        self.creds: Optional[Credentials] = None
        self.drive = None
        # Use a separate token file for Drive to ensure the correct scopes are granted
        self.token_path = os.path.join(settings.BASE_DIR, 'token_drive.pickle')
        self.credentials_path = os.path.join(settings.BASE_DIR, 'credentials.json')
        self.redirect_uri = 'http://127.0.0.1:8000/google-sheets/oauth2callback/'

    def authenticate(self, request=None):
        print("[Drive] Authenticate: starting")
        # Prefer using the same token file created by GoogleSheetsService if it exists
        sheets_token_path = os.path.join(settings.BASE_DIR, 'token.pickle')
        candidate_token = sheets_token_path if os.path.exists(sheets_token_path) else self.token_path
        if os.path.exists(candidate_token):
            with open(candidate_token, 'rb') as token:
                self.creds = pickle.load(token)

        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                # Try to leverage OAuth code from session (web flow)
                auth_code = None
                if request and hasattr(request, 'session'):
                    auth_code = request.session.get('google_auth_code')
                    if auth_code:
                        del request.session['google_auth_code']

                flow = Flow.from_client_secrets_file(self.credentials_path, self.SCOPES, redirect_uri=self.redirect_uri)
                if auth_code:
                    flow.fetch_token(code=auth_code)
                    self.creds = flow.credentials
                else:
                    # Generate auth URL and prompt in console as a fallback
                    auth_url, _ = flow.authorization_url(
                        prompt='consent', access_type='offline', include_granted_scopes='true'
                    )
                    print('Authorize app in browser:', auth_url)
                    try:
                        code = input('Enter code: ').strip()
                        flow.fetch_token(code=code)
                        self.creds = flow.credentials
                    except Exception:
                        raise

            with open(self.token_path, 'wb') as token:
                pickle.dump(self.creds, token)

        self.drive = build('drive', 'v3', credentials=self.creds)
        print("[Drive] Authenticate: completed")
        return self.drive

    def list_files_in_folder(self, folder_id: str, request=None, max_items: Optional[int] = None) -> List[Dict]:
        if not self.drive:
            self.authenticate(request)
        results = []
        page_token = None
        query = f"'{folder_id}' in parents and trashed = false"
        page_count = 0

        while True:
            try:
                remaining = None
                if isinstance(max_items, int) and max_items > 0:
                    remaining = max_items - len(results)
                effective_page_size = 1000 if remaining is None else max(1, min(remaining, 1000))

                # Show progress for each page
                page_count += 1
                print(f"[Drive] Fetching page {page_count} (pageSize={effective_page_size})...")

                resp = self.drive.files().list(
                    q=query,
                    fields='nextPageToken, files(id, name, webViewLink, mimeType)',
                    pageSize=effective_page_size,
                    pageToken=page_token,
                    includeItemsFromAllDrives=True,
                    supportsAllDrives=True
                ).execute()
            except Exception as e:
                print(f"[Drive] Error: {e}")
                # If scopes are insufficient, force re-authentication once by removing token and retrying
                from googleapiclient.errors import HttpError
                if isinstance(e, HttpError) and e.resp.status == 403:
                    try:
                        # Remove both Drive and Sheets tokens to force re-consent with correct scopes
                        if os.path.exists(self.token_path):
                            os.remove(self.token_path)
                        sheets_token_path = os.path.join(settings.BASE_DIR, 'token.pickle')
                        if os.path.exists(sheets_token_path):
                            os.remove(sheets_token_path)
                        print("[Drive] 403 error - tokens removed, re-authenticating...")
                        self.authenticate(request)
                        resp = self.drive.files().list(
                            q=query,
                            fields='nextPageToken, files(id, name, webViewLink, mimeType)',
                            pageSize=effective_page_size,
                            pageToken=page_token,
                            includeItemsFromAllDrives=True,
                            supportsAllDrives=True
                        ).execute()
                    except Exception:
                        raise
                else:
                    raise
            batch = resp.get('files', [])
            print(f"[Drive] Received {len(batch)} files (total so far: {len(results) + len(batch)})")
            results.extend(batch)

            if isinstance(max_items, int) and max_items > 0 and len(results) >= max_items:
                print(f"[Drive] Reached limit of {max_items} files, stopping")
                break
            page_token = resp.get('nextPageToken')
            if not page_token:
                print(f"[Drive] No more pages, finished")
                break

        print(f"[Drive] Total files retrieved: {len(results)}")
        return results

    @staticmethod
    def build_file_lookup(files: List[Dict]) -> Dict[str, Dict]:
        lookup: Dict[str, Dict] = {}
        pattern = re.compile(r'^([A-Za-z]+)-([A-Z]{2}-[A-Z]{3}-[A-Z]{3}-[A-Z]{2,3}-\d+)-(\d{4}-\d{2}-\d{2})')
        for f in files:
            m = pattern.match(f.get('name', ''))
            if not m:
                continue
            commodity_prefix, account_code, date_str = m.group(1), m.group(2), m.group(3)
            try:
                zip_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                continue
            key = f"{commodity_prefix.lower()}|{account_code}|{date_str}"
            lookup[key] = {
                'url': f.get('webViewLink'),
                'name': f.get('name'),
                'id': f.get('id'),
                'mimeType': f.get('mimeType'),
                'commodity': commodity_prefix,
                'accountCode': account_code,
                'zipDate': zip_date,
                'zipDateStr': date_str,
            }
        return lookup

    @staticmethod
    def find_best_link(account_code: str, commodity: str, inspection_date, file_lookup: Dict[str, Dict]) -> Optional[str]:
        if not account_code or account_code == 'no' or not commodity or not inspection_date:
            return None
        commodity_str = str(commodity).strip().lower()
        if commodity_str == 'eggs':
            commodity_str = 'egg'
        try:
            insp_date = inspection_date if hasattr(inspection_date, 'toordinal') else datetime.strptime(str(inspection_date), '%Y-%m-%d').date()
        except Exception:
            return None
        best = None
        best_days = 10**9
        for file in file_lookup.values():
            # Match by account code only (ignore commodity mismatch)
            if file['accountCode'] == account_code:
                days_diff = abs((file['zipDate'] - insp_date).days)
                if days_diff <= 15 and days_diff < best_days:
                    best = file
                    best_days = days_diff
        return best['url'] if best else None

    def download_file(self, file_id: str, dest_path: str, request=None) -> bool:
        """Download file from Google Drive and return True if successful, False otherwise."""
        try:
            print(f"[Drive] Download: id={file_id} -> {dest_path}")
            if not self.drive:
                self.authenticate(request)
            
            from googleapiclient.http import MediaIoBaseDownload
            import io
            
            request = self.drive.files().get_media(fileId=file_id)
            fh = io.FileIO(dest_path, 'wb')
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    try:
                        print(f"[Drive] Download: progress {int(status.progress() * 100)}%")
                    except Exception:
                        pass
            
            fh.close()
            
            # Verify the file was actually downloaded and has content
            if os.path.exists(dest_path):
                file_size = os.path.getsize(dest_path)
                print(f"[Drive] Download: completed, file size: {file_size} bytes")
                
                if file_size > 0:
                    return True
                else:
                    print(f"[Drive] Download: ERROR - file is empty ({file_size} bytes)")
                    # Remove the empty file
                    try:
                        os.remove(dest_path)
                    except:
                        pass
                    return False
            else:
                print(f"[Drive] Download: ERROR - file was not created")
                return False
                
        except Exception as e:
            print(f"[Drive] Download: ERROR - {e}")
            # Clean up any partial file
            try:
                if os.path.exists(dest_path):
                    os.remove(dest_path)
            except:
                pass
            return False

    def download_file_content(self, file_id: str, request=None) -> bytes:
        """Download file content from Google Drive and return as bytes (in memory)."""
        print(f"[Drive] Download Content: id={file_id}")
        if not self.drive:
            self.authenticate(request)
        
        try:
            from googleapiclient.http import MediaIoBaseDownload
            import io
            
            # Get the file media
            request = self.drive.files().get_media(fileId=file_id)
            
            # Use BytesIO to store content in memory
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    try:
                        print(f"[Drive] Download Content: progress {int(status.progress() * 100)}%")
                    except Exception:
                        pass
            
            # Get the content as bytes
            content = fh.getvalue()
            fh.close()
            
            print(f"[Drive] Download Content: completed, size={len(content)} bytes")
            return content
            
        except Exception as e:
            print(f"[Drive] Download Content: error {e}")
            return None

    def search_files_in_folder_by_name(self, folder_id: str, name_contains: str, request=None, max_items: Optional[int] = 50) -> List[Dict]:
        print(f"[Drive] Search: folder={folder_id}, contains='{name_contains}', max_items={max_items}")
        if not self.drive:
            self.authenticate(request)
        results: List[Dict] = []
        page_token = None
        # Drive query supports name contains and parent folder filter
        # Escape single quotes in name_contains
        safe_contains = (name_contains or '').replace("'", "\'")
        query = f"'{folder_id}' in parents and trashed = false and name contains '{safe_contains}'"
        while True:
            try:
                remaining = None
                if isinstance(max_items, int) and max_items > 0:
                    remaining = max_items - len(results)
                effective_page_size = 1000 if remaining is None else max(1, min(remaining, 1000))
                print(f"[Drive] Search: requesting page (page_token={page_token}, pageSize={effective_page_size})")
                resp = self.drive.files().list(
                    q=query,
                    fields='nextPageToken, files(id, name, webViewLink, mimeType)',
                    pageSize=effective_page_size,
                    pageToken=page_token,
                    includeItemsFromAllDrives=True,
                    supportsAllDrives=True
                ).execute()
            except Exception as e:
                print(f"[Drive] Search: error {e}")
                raise
            batch = resp.get('files', [])
            print(f"[Drive] Search: received {len(batch)} files in page")
            results.extend(batch)
            if isinstance(max_items, int) and max_items > 0 and len(results) >= max_items:
                print(f"[Drive] Search: reached max_items={max_items}, stopping")
                break
            page_token = resp.get('nextPageToken')
            if not page_token:
                break
        print(f"[Drive] Search: total files collected={len(results)}")
        return results

    def search_files_in_folder_by_tokens(self, folder_id: str, tokens: List[str], request=None, max_items: Optional[int] = 50) -> List[Dict]:
        print(f"[Drive] SearchTokens: folder={folder_id}, tokens={tokens}, max_items={max_items}")
        if not self.drive:
            self.authenticate(request)
        results: List[Dict] = []
        page_token = None
        safe_tokens = [str(t or '').replace("'", "\'") for t in (tokens or []) if (t or '').strip()]
        token_query = ' and '.join([f"name contains '{t}'" for t in safe_tokens]) if safe_tokens else ''
        base = f"'{folder_id}' in parents and trashed = false"
        query = f"{base} and {token_query}" if token_query else base
        while True:
            try:
                remaining = None
                if isinstance(max_items, int) and max_items > 0:
                    remaining = max_items - len(results)
                effective_page_size = 1000 if remaining is None else max(1, min(remaining, 1000))
                print(f"[Drive] SearchTokens: requesting page (page_token={page_token}, pageSize={effective_page_size})")
                resp = self.drive.files().list(
                    q=query,
                    fields='nextPageToken, files(id, name, webViewLink, mimeType)',
                    pageSize=effective_page_size,
                    pageToken=page_token,
                    includeItemsFromAllDrives=True,
                    supportsAllDrives=True
                ).execute()
            except Exception as e:
                print(f"[Drive] SearchTokens: error {e}")
                raise
            batch = resp.get('files', [])
            print(f"[Drive] SearchTokens: received {len(batch)} files in page")
            results.extend(batch)
            if isinstance(max_items, int) and max_items > 0 and len(results) >= max_items:
                print(f"[Drive] SearchTokens: reached max_items={max_items}, stopping")
                break
            page_token = resp.get('nextPageToken')
            if not page_token:
                break
        print(f"[Drive] SearchTokens: total files collected={len(results)}")
        return results


