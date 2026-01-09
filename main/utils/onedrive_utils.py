"""
OneDrive utility functions for file and folder operations
"""

import os
import json
import requests
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import hashlib


def generate_structured_filename(inspection, file_type, original_filename):
    """
    Generate structured filename: FSA-{TYPE}-{NN}-{YYMM}
    
    Args:
        inspection: Inspection object
        file_type: Type of file (RFI, INV, LAB, COMP)
        original_filename: Original filename to preserve extension
    
    Returns:
        str: Structured filename
    """
    # Get year and month from inspection date
    inspection_date = inspection.date_of_inspection
    if not inspection_date:
        inspection_date = timezone.now().date()
    
    year_month = inspection_date.strftime('%y%m')  # YYMM format
    
    # Generate inspector initials (NN) - first letter of first name and last name
    inspector_name = inspection.inspector_name or "Unknown"
    name_parts = inspector_name.strip().split()
    
    if len(name_parts) >= 2:
        # First letter of first name + first letter of last name
        inspector_initials = f"{name_parts[0][0].upper()}{name_parts[-1][0].upper()}"
    elif len(name_parts) == 1:
        # If only one name, use first two letters
        inspector_initials = name_parts[0][:2].upper()
    else:
        # Fallback if no name
        inspector_initials = "XX"
    
    # Get file extension from original filename
    file_extension = os.path.splitext(original_filename)[1]
    
    # Generate structured filename
    structured_name = f"FSA-{file_type}-{inspector_initials}-{year_month}{file_extension}"
    
    return structured_name


def get_access_token():
    """Get valid access token from file"""
    token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
    
    if not os.path.exists(token_file):
        return None
    
    with open(token_file, 'r') as f:
        tokens = json.load(f)
    
    # Check if token is expired
    current_time = datetime.now().timestamp()
    if current_time >= tokens.get('expires_at', 0):
        return None
    
    return tokens.get('access_token')


def refresh_access_token():
    """Refresh access token using refresh token"""
    token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
    
    if not os.path.exists(token_file):
        return None
    
    with open(token_file, 'r') as f:
        tokens = json.load(f)
    
    refresh_token = tokens.get('refresh_token')
    if not refresh_token:
        return None
    
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    token_data = {
        'client_id': settings.ONEDRIVE_CLIENT_ID,
        'client_secret': settings.ONEDRIVE_CLIENT_SECRET,
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    
    try:
        response = requests.post(token_url, data=token_data)
        
        if response.status_code == 200:
            token_response = response.json()
            new_tokens = {
                'access_token': token_response.get('access_token'),
                'refresh_token': token_response.get('refresh_token', refresh_token),
                'expires_in': token_response.get('expires_in'),
                'token_type': token_response.get('token_type'),
                'expires_at': datetime.now().timestamp() + token_response.get('expires_in', 3600)
            }
            
            with open(token_file, 'w') as f:
                json.dump(new_tokens, f, indent=2)
            
            return new_tokens.get('access_token')
        else:
            print(f"❌ Failed to refresh token: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error refreshing token: {str(e)}")
        return None


def get_valid_access_token():
    """Get a valid access token, refreshing if necessary"""
    access_token = get_access_token()
    
    if not access_token:
        print("🔄 Refreshing access token...")
        access_token = refresh_access_token()
    
    return access_token


def create_onedrive_folder(folder_name, parent_id="root"):
    """Create a folder on OneDrive"""
    access_token = get_valid_access_token()
    if not access_token:
        print("❌ No valid access token available")
        return None
    
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_id}/children"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    folder_data = {
        "name": folder_name,
        "folder": {},
        "@microsoft.graph.conflictBehavior": "rename"
    }
    
    try:
        response = requests.post(url, headers=headers, json=folder_data)
        
        if response.status_code == 201:
            folder_info = response.json()
            print(f"✅ Created OneDrive folder: {folder_name}")
            return folder_info.get('id')
        else:
            print(f"❌ Failed to create folder '{folder_name}': {response.status_code}")
            if response.status_code == 409:
                # Folder might already exist, try to find it
                return find_folder_by_name(folder_name, parent_id)
            return None
            
    except Exception as e:
        print(f"❌ Error creating folder '{folder_name}': {str(e)}")
        return None


def find_folder_by_name(folder_name, parent_id="root"):
    """Find a folder by name in OneDrive"""
    access_token = get_valid_access_token()
    if not access_token:
        return None
    
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{parent_id}/children"
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('value', [])
            
            for item in items:
                if 'folder' in item and item.get('name') == folder_name:
                    return item.get('id')
            
            return None
        else:
            print(f"❌ Failed to search for folder: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error searching for folder: {str(e)}")
        return None


def upload_file_to_onedrive(file_path, folder_id, file_name=None):
    """Upload a file to OneDrive folder"""
    access_token = get_valid_access_token()
    if not access_token:
        return None
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None
    
    if not file_name:
        file_name = os.path.basename(file_path)
    
    # Use simple upload for files under 4MB
    url = f"https://graph.microsoft.com/v1.0/me/drive/items/{folder_id}:/{file_name}:/content"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/octet-stream'
    }
    
    try:
        with open(file_path, 'rb') as file:
            response = requests.put(url, headers=headers, data=file)
        
        if response.status_code in [200, 201]:
            file_info = response.json()
            print(f"✅ Uploaded: {file_name} ({os.path.getsize(file_path)} bytes)")
            return file_info.get('id')
        else:
            print(f"❌ Failed to upload '{file_name}': {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading '{file_name}': {str(e)}")
        return None


def create_monthly_folder_structure(year, month):
    """Create folder structure: Food Safety Agency/YYYY/MM-YYYY/"""
    access_token = get_valid_access_token()
    if not access_token:
        return None
    
    # Create main folder if it doesn't exist
    main_folder_id = create_onedrive_folder("Food Safety Agency")
    if not main_folder_id:
        return None
    
    # Create year folder
    year_folder_id = create_onedrive_folder(str(year), main_folder_id)
    if not year_folder_id:
        return None
    
    # Create month folder
    month_name = datetime(year, month, 1).strftime("%B")
    month_folder_name = f"{month:02d}-{month_name} {year}"
    month_folder_id = create_onedrive_folder(month_folder_name, year_folder_id)
    
    return month_folder_id


def upload_organized_compliance_structure(inspection, inspection_folder_id, uploaded_files, local_files_to_delete):
    """Upload the organized compliance structure (individual inspection folders) to OneDrive."""
    try:
        from django.conf import settings
        from datetime import datetime
        
        # Build the client folder path
        year_folder = inspection.date_of_inspection.strftime('%Y')
        month_folder = inspection.date_of_inspection.strftime('%B')
        client_folder = inspection.client_name or 'Unknown Client'
        
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
        
        uploaded_any = False
        
        # Upload main document type folders (rfi, invoice, Compliance)
        main_folders = ['rfi', 'invoice', 'Compliance']  # Capital C for Compliance
        for folder_name in main_folders:
            folder_path = os.path.join(base_path, folder_name)
            if os.path.exists(folder_path):
                print(f"📁 Uploading {folder_name} files from {folder_path}")
                onedrive_folder_id = create_onedrive_folder(folder_name, inspection_folder_id)
                if onedrive_folder_id:
                    for root, dirs, files in os.walk(folder_path):
                        for file in files:
                            if file.lower().endswith('.pdf'):
                                file_path = os.path.join(root, file)
                                file_id = upload_file_to_onedrive(file_path, onedrive_folder_id, file)
                                if file_id:
                                    uploaded_files.append(f"{folder_name}/{file}")
                                    local_files_to_delete.append(file_path)
                                    uploaded_any = True
                                    print(f"  📄 Uploaded {folder_name}: {file}")
        
        # Upload individual inspection folders
        for item in os.listdir(base_path):
            item_path = os.path.join(base_path, item)
            if os.path.isdir(item_path) and item.startswith('inspection-'):
                inspection_number = item.replace('inspection-', '')
                print(f"📁 Uploading individual inspection folder: {item}")
                
                # Create inspection folder in OneDrive
                onedrive_inspection_folder_id = create_onedrive_folder(item, inspection_folder_id)
                if onedrive_inspection_folder_id:
                    # Upload all subfolders from this inspection folder (compliance, lab, retest, form)
                    subfolders = ['compliance', 'lab', 'retest', 'form']
                    for subfolder in subfolders:
                        subfolder_path = os.path.join(item_path, subfolder)
                        if os.path.exists(subfolder_path):
                            onedrive_subfolder_id = create_onedrive_folder(subfolder, onedrive_inspection_folder_id)
                            if onedrive_subfolder_id:
                                for root, dirs, files in os.walk(subfolder_path):
                                    for file in files:
                                        if file.lower().endswith('.pdf'):
                                            file_path = os.path.join(root, file)
                                            file_id = upload_file_to_onedrive(file_path, onedrive_subfolder_id, file)
                                            if file_id:
                                                uploaded_files.append(f"{item}/{subfolder}/{file}")
                                                local_files_to_delete.append(file_path)
                                                uploaded_any = True
                                                print(f"  📄 Uploaded inspection {inspection_number} {subfolder}: {file}")
        
        return uploaded_any
        
    except Exception as e:
        print(f"❌ Error uploading organized compliance structure: {e}")
        return False


def upload_inspection_files_to_onedrive(inspection, month_folder_id):
    """Upload all files for a specific inspection to OneDrive and delete local files after successful upload"""
    if not month_folder_id:
        print("❌ No month folder ID provided")
        return False
    
    # Create inspection folder
    safe_client_name = inspection.client_name.replace('/', '_').replace('\\', '_').replace(':', '_')[:50]
    inspection_folder_name = f"Inspection_{inspection.remote_id}_{safe_client_name}"
    inspection_folder_id = create_onedrive_folder(inspection_folder_name, month_folder_id)
    
    if not inspection_folder_id:
        print(f"❌ Failed to create inspection folder for {inspection.remote_id}")
        return False
    
    uploaded_files = []
    local_files_to_delete = []  # Track files that were successfully uploaded
    
    # Upload organized compliance structure first (if it exists)
    try:
        organized_uploaded = upload_organized_compliance_structure(inspection, inspection_folder_id, uploaded_files, local_files_to_delete)
        if organized_uploaded:
            print(f"✅ Uploaded organized compliance structure for inspection {inspection.remote_id}")
    except Exception as e:
        print(f"⚠️ Error uploading organized compliance structure: {str(e)}")
    
    # Continue with original upload logic for other files...
    
    # Upload compliance documents (only if organized structure doesn't exist)
    try:
        # Check if organized compliance structure was uploaded
        organized_exists = any('Compliance/' in f or 'inspection-' in f for f in uploaded_files)
        
        if not organized_exists and hasattr(inspection, 'compliance_documents'):
            print("📄 Uploading original compliance documents (no organized structure found)")
            for doc in inspection.compliance_documents.all():
                if doc.file_path and os.path.exists(doc.file_path):
                    original_filename = os.path.basename(doc.file_path)
                    file_name = generate_structured_filename(inspection, 'COMP', original_filename)
                    file_id = upload_file_to_onedrive(doc.file_path, inspection_folder_id, file_name)
                    if file_id:
                        uploaded_files.append(file_name)
                        local_files_to_delete.append(doc.file_path)
                        print(f"📄 Uploaded compliance: {file_name}")
        elif organized_exists:
            print("✅ Skipping original compliance documents (organized structure already uploaded)")
    except Exception as e:
        print(f"⚠️ Error uploading compliance documents: {str(e)}")
    
    # Upload RFI documents
    try:
        if hasattr(inspection, 'rfi_documents'):
            for doc in inspection.rfi_documents.all():
                if doc.file_path and os.path.exists(doc.file_path):
                    original_filename = os.path.basename(doc.file_path)
                    file_name = generate_structured_filename(inspection, 'RFI', original_filename)
                    file_id = upload_file_to_onedrive(doc.file_path, inspection_folder_id, file_name)
                    if file_id:
                        uploaded_files.append(file_name)
                        local_files_to_delete.append(doc.file_path)
                        print(f"📄 Uploaded RFI: {file_name}")
    except Exception as e:
        print(f"⚠️ Error uploading RFI documents: {str(e)}")
    
    # Upload inspection files from media directory
    try:
        inspection_files_dir = os.path.join(settings.MEDIA_ROOT, 'inspections', str(inspection.remote_id))
        if os.path.exists(inspection_files_dir):
            for root, dirs, files in os.walk(inspection_files_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    original_filename = os.path.basename(file)
                    
                    # Skip ZIP files if organized structure exists
                    if file.lower().endswith('.zip'):
                        organized_exists = any('Compliance/' in f or 'inspection-' in f for f in uploaded_files)
                        if organized_exists:
                            print(f"⏭️ Skipping ZIP file (organized structure exists): {file}")
                            continue
                    
                    # Determine file type based on filename patterns
                    file_lower = file.lower()
                    if 'rfi' in file_lower or 'request' in file_lower:
                        file_type = 'RFI'
                    elif 'invoice' in file_lower or 'inv' in file_lower:
                        file_type = 'INV'
                    elif 'lab' in file_lower or 'laboratory' in file_lower or 'test' in file_lower:
                        file_type = 'LAB'
                    elif 'compliance' in file_lower or 'comp' in file_lower:
                        file_type = 'COMP'
                    else:
                        file_type = 'DOC'  # Generic document
                    
                    file_name = generate_structured_filename(inspection, file_type, original_filename)
                    file_id = upload_file_to_onedrive(file_path, inspection_folder_id, file_name)
                    if file_id:
                        uploaded_files.append(file_name)
                        local_files_to_delete.append(file_path)
                        print(f"📄 Uploaded {file_type}: {file_name}")
    except Exception as e:
        print(f"⚠️ Error uploading inspection files: {str(e)}")
    
    # Upload any files from the main media directory for this inspection
    try:
        main_inspection_dir = os.path.join(settings.MEDIA_ROOT, 'inspection_files', str(inspection.remote_id))
        if os.path.exists(main_inspection_dir):
            for root, dirs, files in os.walk(main_inspection_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    original_filename = os.path.basename(file)
                    
                    # Skip ZIP files if organized structure exists
                    if file.lower().endswith('.zip'):
                        organized_exists = any('Compliance/' in f or 'inspection-' in f for f in uploaded_files)
                        if organized_exists:
                            print(f"⏭️ Skipping ZIP file (organized structure exists): {file}")
                            continue
                    
                    # Determine file type based on filename patterns
                    file_lower = file.lower()
                    if 'rfi' in file_lower or 'request' in file_lower:
                        file_type = 'RFI'
                    elif 'invoice' in file_lower or 'inv' in file_lower:
                        file_type = 'INV'
                    elif 'lab' in file_lower or 'laboratory' in file_lower or 'test' in file_lower:
                        file_type = 'LAB'
                    elif 'compliance' in file_lower or 'comp' in file_lower:
                        file_type = 'COMP'
                    else:
                        file_type = 'DOC'  # Generic document
                    
                    file_name = generate_structured_filename(inspection, file_type, original_filename)
                    file_id = upload_file_to_onedrive(file_path, inspection_folder_id, file_name)
                    if file_id:
                        uploaded_files.append(file_name)
                        local_files_to_delete.append(file_path)
                        print(f"📄 Uploaded {file_type}: {file_name}")
    except Exception as e:
        print(f"⚠️ Error uploading main inspection files: {str(e)}")
    
    # Create a summary file with inspection details
    try:
        # Generate inspector initials for reference
        inspection_date = inspection.date_of_inspection or timezone.now().date()
        inspector_name = inspection.inspector_name or "Unknown"
        name_parts = inspector_name.strip().split()
        
        if len(name_parts) >= 2:
            inspector_initials = f"{name_parts[0][0].upper()}{name_parts[-1][0].upper()}"
        elif len(name_parts) == 1:
            inspector_initials = name_parts[0][:2].upper()
        else:
            inspector_initials = "XX"
        
        year_month = inspection_date.strftime('%y%m')
        
        summary_content = f"""Inspection Summary
==================
Inspection ID: {inspection.remote_id}
Client: {inspection.client_name}
Inspector: {inspection.inspector_name}
Date: {inspection.date_of_inspection}
Commodity: {inspection.commodity}
Product: {inspection.product_name}
Sent Date: {inspection.sent_date}
Upload Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}

File Naming Convention:
- Format: FSA-{{TYPE}}-{{NN}}-{{YYMM}}
- FSA: Food Safety Agency
- TYPE: RFI (Request for Information), INV (Invoice), LAB (Laboratory), COMP (Compliance), DOC (Document)
- NN: Inspector Initials: {inspector_initials} ({inspector_name})
- YYMM: Year/Month: {year_month}

Files Uploaded: {len(uploaded_files)}
"""
        summary_file_path = os.path.join(settings.BASE_DIR, f'temp_summary_{inspection.remote_id}.txt')
        with open(summary_file_path, 'w') as f:
            f.write(summary_content)
        
        file_id = upload_file_to_onedrive(summary_file_path, inspection_folder_id, "inspection_summary.txt")
        if file_id:
            uploaded_files.append("inspection_summary.txt")
        
        # Clean up temp file
        os.remove(summary_file_path)
        
    except Exception as e:
        print(f"⚠️ Error creating summary file: {str(e)}")
    
    # Only proceed with deletion if we successfully uploaded files
    if len(uploaded_files) > 0:
        print(f"✅ Uploaded {len(uploaded_files)} files for inspection {inspection.remote_id}")
        
        # Delete local files after successful upload
        deleted_count = 0
        for file_path in local_files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_count += 1
                    print(f"🗑️ Deleted local file: {os.path.basename(file_path)}")
            except Exception as e:
                print(f"⚠️ Error deleting {file_path}: {str(e)}")
        
        print(f"🗑️ Deleted {deleted_count}/{len(local_files_to_delete)} local files")
        
        # Delete empty directories
        try:
            inspection_files_dir = os.path.join(settings.MEDIA_ROOT, 'inspections', str(inspection.remote_id))
            if os.path.exists(inspection_files_dir) and not os.listdir(inspection_files_dir):
                os.rmdir(inspection_files_dir)
                print(f"🗑️ Deleted empty directory: {inspection_files_dir}")
            
            main_inspection_dir = os.path.join(settings.MEDIA_ROOT, 'inspection_files', str(inspection.remote_id))
            if os.path.exists(main_inspection_dir) and not os.listdir(main_inspection_dir):
                os.rmdir(main_inspection_dir)
                print(f"🗑️ Deleted empty directory: {main_inspection_dir}")
        except Exception as e:
            print(f"⚠️ Error deleting empty directories: {str(e)}")
        
        return True
    else:
        print(f"❌ No files uploaded for inspection {inspection.remote_id}")
        return False
