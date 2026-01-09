#!/usr/bin/env python3
"""
Daily Compliance Sync Service
Handles daily synchronization of compliance documents with skip logic
"""

import os
import sys
import django
import threading
import time
import json
from datetime import datetime, timedelta, date
from django.conf import settings
from django.core.cache import cache

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.conf import settings
from django.core.cache import cache
from ..models import SystemSettings, FoodSafetyAgencyInspection
from ..views.core_views import load_drive_files_real, find_document_link_apps_script_replica, download_compliance_document


class DailyComplianceSyncService:
    """Service for daily compliance document synchronization with skip logic."""
    
    def __init__(self):
        self.is_running = False
        self.sync_thread = None
        self.last_sync_time = None
        self.sync_stats = {
            'total_documents_processed': 0,
            'documents_skipped': 0,
            'documents_processed': 0,
            'last_sync_time': None,
            'next_sync_time': None
        }

        # Auto-restart service if it was running before (persists across Django reloads/page refreshes)
        self._auto_restart_if_needed()
    
    def get_system_settings(self):
        """Get current system settings."""
        try:
            return SystemSettings.get_settings()
        except Exception as e:
            print(f"Error getting system settings: {e}")
            return None
    
    def should_run_daily_sync(self, manual_start=False):
        """Check if daily sync should run based on settings and last run time."""
        settings = self.get_system_settings()
        if not settings or not settings.compliance_daily_sync_enabled:
            return False
        
        # If this is a manual start, always run regardless of last run time
        if manual_start:
            print("Manual start requested - running daily sync regardless of last run time.")
            return True
        
        # Check if we've already run today (only for automatic runs)
        if settings.compliance_last_processed_date:
            last_run = settings.compliance_last_processed_date.date()
            today = datetime.now().date()
            if last_run >= today:
                print(f"Daily compliance sync already ran today ({last_run}). Skipping.")
                return False
        
        return True
    
    def get_processed_documents_cache(self):
        """Get cache of already processed documents with automatic reset detection."""
        import os
        from django.conf import settings
        
        cache_key = 'processed_compliance_documents'
        media_check_key = 'media_folder_exists'
        
        # Check if media/inspection folder exists
        media_inspection_path = os.path.join(settings.MEDIA_ROOT, 'inspection')
        media_exists = os.path.exists(media_inspection_path)
        
        # Get previous media folder state from cache
        previous_media_state = cache.get(media_check_key, True)
        
        # If media folder was deleted since last check, clear the processed cache
        if previous_media_state and not media_exists:
            print("🧹 DETECTED: Media folder was deleted! Clearing processed documents cache...")
            cache.delete(cache_key)
            cache.set(media_check_key, False, 60 * 60 * 24)  # Remember for 24 hours
            return set()  # Return empty set to force reprocessing
        
        # If media folder was recreated, also clear cache
        if not previous_media_state and media_exists:
            print("DETECTED: Media folder was recreated! Clearing processed documents cache...")
            cache.delete(cache_key)
            cache.set(media_check_key, True, 60 * 60 * 24)  # Remember for 24 hours
            return set()  # Return empty set to force reprocessing
        
        # Update media folder state in cache
        cache.set(media_check_key, media_exists, 60 * 60 * 24)
        
        # Return normal processed documents cache
        processed_docs = cache.get(cache_key, set())
        return processed_docs
    
    def add_to_processed_cache(self, document_id):
        """Add document to processed cache."""
        cache_key = 'processed_compliance_documents'
        processed_docs = self.get_processed_documents_cache()
        processed_docs.add(document_id)
        # Cache for 7 days
        cache.set(cache_key, processed_docs, 7 * 24 * 60 * 60)
    
    def is_document_processed(self, document_id):
        """Check if document has already been processed."""
        if not self.get_system_settings().compliance_skip_processed:
            return False
        
        processed_docs = self.get_processed_documents_cache()
        return document_id in processed_docs
    
    def generate_document_id(self, inspection):
        """Generate unique document ID for tracking."""
        return f"{inspection.id}_{inspection.date_of_inspection.strftime('%Y%m%d')}"
    
    def load_drive_files_standalone(self):
        """Load Google Drive files from year folders (2025, 2026, etc.) containing month folders."""
        try:
            # Check if force stop was requested
            if hasattr(self, '_force_stop_processing') and self._force_stop_processing:
                print("STOP: Force stop requested - aborting file loading")
                return None

            from ..services.google_drive_service import GoogleDriveService
            import re
            from datetime import datetime

            drive_service = GoogleDriveService()
            # Parent folder containing year folders (2025, 2026, etc.)
            parent_folder_id = "1Q8ZXVC2NhzrPpDCdwfHGt8o726fLtqE_"

            print("[Cloud] Loading Google Drive files for compliance sync (2025+)...")
            print("[Wait] Fetching year folders...")
            start_time = datetime.now()

            # Step 1: Get all year folders (2025, 2026, etc.)
            all_year_items = drive_service.list_files_in_folder(parent_folder_id, request=None, max_items=None)
            print(f"[Retrieved] {len(all_year_items)} items from parent folder")

            # Filter for year folders (folders named with 4-digit years)
            year_folders = []
            for item in all_year_items:
                if item.get('mimeType') != 'application/vnd.google-apps.folder':
                    continue

                folder_name = item.get('name', '')
                folder_id = item.get('id', '')

                # Match 4-digit year folders (2025, 2026, etc.)
                if re.match(r'^\d{4}$', folder_name):
                    year = int(folder_name)
                    # Only process year 2025 and onwards
                    if year >= 2025:
                        year_folders.append({
                            'name': folder_name,
                            'id': folder_id,
                            'year': year
                        })
                        print(f"   [OK] Found year folder: {folder_name}")
                    else:
                        print(f"   [SKIP] Skipping: {folder_name} (before 2025)")

            if not year_folders:
                print("[WARNING] No year folders found (2025+)")
                return {}

            print(f"[OK] Found {len(year_folders)} year folder(s) to process")

            # Step 2: Get month folders from each year folder
            month_folders = []
            for year_folder in sorted(year_folders, key=lambda x: x['year']):
                print(f"\n[Fetching] Month folders from: {year_folder['name']}")
                month_items = drive_service.list_files_in_folder(year_folder['id'], request=None, max_items=None)
                print(f"   [Retrieved] {len(month_items)} items from {year_folder['name']}")

                for item in month_items:
                    # Check if it's a folder
                    if item.get('mimeType') != 'application/vnd.google-apps.folder':
                        continue

                    folder_name = item.get('name', '')
                    folder_id = item.get('id', '')

                    # Parse folder name like "October 2025", "November 2025"
                    # Pattern: Month Year
                    month_year_pattern = re.match(r'^([A-Za-z]+)\s+(\d{4})$', folder_name)
                    if month_year_pattern:
                        month_name = month_year_pattern.group(1)
                        year = int(month_year_pattern.group(2))

                        try:
                            # Parse month name to month number
                            month_date = datetime.strptime(f"{month_name} {year}", "%B %Y")
                            folder_date = month_date.date()

                            # Only include folders from October 2025 onwards
                            if folder_date >= date(2025, 10, 1):
                                month_folders.append({
                                    'name': folder_name,
                                    'id': folder_id,
                                    'date': folder_date
                                })
                                print(f"      [OK] Including: {folder_name}")
                            else:
                                print(f"      [SKIP]  Skipping: {folder_name} (before October 2025)")
                        except ValueError:
                            print(f"      [WARN]  Could not parse folder name: {folder_name}")
                            continue

            print(f"\n[OK] Found {len(month_folders)} total month folders to process (October 2025+)")

            # Step 3: Load files from each month folder
            file_lookup = {}
            total_file_count = 0

            for month_folder in sorted(month_folders, key=lambda x: x['date']):
                # Check stop flag
                if not self.is_running or (hasattr(self, '_force_stop_processing') and self._force_stop_processing):
                    print("[STOP] Stop requested during folder processing - aborting")
                    break

                print(f"\n[Fetching] Files from: {month_folder['name']}")
                folder_files = drive_service.list_files_in_folder(month_folder['id'], request=None, max_items=None)
                print(f"   [Retrieved] {len(folder_files)} files from {month_folder['name']}")

                # Process files from this month folder
                month_file_count = 0
                for file in folder_files:
                    # Check stop flag
                    if not self.is_running or (hasattr(self, '_force_stop_processing') and self._force_stop_processing):
                        print("[STOP] Stop requested during file loading - aborting")
                        break

                    # Check global stop flag
                    import threading
                    if hasattr(threading, '_global_stop_flag') and threading._global_stop_flag.is_set():
                        print("[STOP] Global stop flag detected during file loading - aborting")
                        break

                    file_name = file.get('name', '')
                    file_id = file.get('id', '')
                    web_view_link = file.get('webViewLink', '')

                    # Apps Script pattern: COMMODITY-ACCOUNT_CODE-DATE
                    # Example: RAW-RE-IND-RAW-NA-1000-2025-10-15
                    full_pattern = re.match(r'^([A-Za-z]+)-([A-Z]{2}-[A-Z]{3}-[A-Z]{3}-[A-Z]{2,3}-\d+)-(\d{4}-\d{2}-\d{2})', file_name)

                    if full_pattern and file_id:
                        commodity_prefix = full_pattern.group(1)
                        account_code = full_pattern.group(2)
                        zip_date_str = full_pattern.group(3)

                        try:
                            zip_date = datetime.strptime(zip_date_str, '%Y-%m-%d')
                        except:
                            continue

                        # Create compound key exactly like Apps Script
                        compound_key = f"{commodity_prefix.lower()}|{account_code}|{zip_date_str}"

                        file_lookup[compound_key] = {
                            'url': web_view_link or f"https://drive.google.com/file/d/{file_id}/view",
                            'name': file_name,
                            'commodity': commodity_prefix,
                            'accountCode': account_code,
                            'zipDate': zip_date,
                            'zipDateStr': zip_date_str,
                            'file_id': file_id
                        }

                        month_file_count += 1
                        total_file_count += 1

                print(f"   [OK] Processed {month_file_count} compliance files from {month_folder['name']}")

            load_time = (datetime.now() - start_time).total_seconds()
            print(f"\n[COMPLETE] Loaded {len(file_lookup)} compliance files from {len(month_folders)} month folders across {len(year_folders)} year(s) in {load_time:.1f} seconds")
            print(f"[Info] Processed year folders: {', '.join([yf['name'] for yf in year_folders])}")
            print(f"[Optimization] Auto-detects new year folders (2026, 2027, etc.) as they become available")

            return file_lookup

        except Exception as e:
            print(f"[ERROR] Error loading Drive files: {e}")
            return {}

    def get_client_account_code(self, client_name):
        """Get account code for a client name."""
        try:
            from ..models import Client
            
            # Normalize client name
            normalized_name = client_name.strip().lower().replace('\u00A0', ' ').replace('\u200B', '').replace('\u2002', ' ').replace('\u2003', ' ').replace('  ', ' ')
            
            # Find client with matching name
            client = Client.objects.filter(
                name__iexact=normalized_name
            ).exclude(internal_account_code__isnull=True).exclude(internal_account_code='').first()
            
            if client:
                return client.internal_account_code
            
            return None
            
        except Exception as e:
            print(f"[ERROR] Error getting account code for {client_name}: {e}")
            return None

    def process_compliance_documents(self):
        """Process compliance documents with skip logic."""
        print("Starting daily compliance document sync...")

        # Set is_running to True for the duration of this processing
        was_running = self.is_running
        self.is_running = True

        # Reset force stop flag
        self._force_stop_processing = False

        try:
            settings = self.get_system_settings()
            if not settings or not settings.compliance_daily_sync_enabled:
                print("Daily compliance sync is disabled.")
                return

            # Load Google Drive files once at the start
            print("Loading Google Drive files...")
            file_lookup = self.load_drive_files_standalone()
            
            if not file_lookup:
                print("Failed to load Google Drive files. Aborting sync.")
                return
            
            # Get all inspections from Oct 2025 to Apr 2026
            from datetime import date
            start_date = date(2025, 10, 1)
            end_date = date(2026, 4, 1)
            inspections = FoodSafetyAgencyInspection.objects.filter(
                date_of_inspection__gte=start_date,
                date_of_inspection__lt=end_date
            ).order_by('-date_of_inspection')
            
            print(f"📊 Found {inspections.count()} inspections to process")
            
            documents_processed = 0
            documents_skipped = 0
            
            for inspection in inspections:
                # Check stop flag and force stop before processing each inspection
                if not self.is_running or (hasattr(self, '_force_stop_processing') and self._force_stop_processing):
                    print("STOP: Stop requested during processing - aborting sync")
                    break

                # Check global stop flag
                import threading
                if hasattr(threading, '_global_stop_flag') and threading._global_stop_flag.is_set():
                    print("STOP: Global stop flag detected during processing - aborting sync")
                    break
                    
                document_id = self.generate_document_id(inspection)
                
                # Skip if already processed
                if self.is_document_processed(document_id):
                    documents_skipped += 1
                    print(f"[SKIP]  Skipping already processed: {inspection.id}")
                    continue
                
                try:
                    # Process compliance documents for this inspection - SEQUENTIAL APPROACH
                    print(f"🔄 Processing: {inspection.id}")

                    # Use the inspection's own account code directly (from SQL Server)
                    # This is more reliable than looking up by client name
                    account_code = inspection.internal_account_code

                    if not account_code:
                        # Fallback: try to get from Client model if inspection doesn't have it
                        account_code = self.get_client_account_code(inspection.client_name)

                    if not account_code:
                        print(f"[WARN]  No account code found for client: {inspection.client_name}")
                        continue
                    
                    # Find document links using account code
                    document_link = find_document_link_apps_script_replica(
                        account_code, 
                        inspection.commodity or "Unknown",
                        inspection.date_of_inspection,
                        file_lookup
                    )
                    
                    if document_link and document_link != "Document Not Found":
                        print(f"[OK] Found compliance document for {inspection.id} (Account: {account_code})")

                        # IMMEDIATELY DOWNLOAD the document
                        try:
                            # Find the matching file in lookup for download
                            # Build the compound key to find the exact file
                            date_str = inspection.date_of_inspection.strftime('%Y-%m-%d')
                            commodity_prefix = str(inspection.commodity).lower().strip()
                            if commodity_prefix == 'eggs':
                                commodity_prefix = 'egg'

                            # Search for matching files within 15 days
                            best_match = None
                            best_days_diff = 999

                            for file_key, file_info in file_lookup.items():
                                # Match by account code only (ignore commodity)
                                if file_info.get('accountCode') == account_code:

                                    # Calculate days difference - ensure both are date objects
                                    file_date = file_info['zipDate']
                                    inspection_date = inspection.date_of_inspection

                                    # Convert datetime to date if needed
                                    if hasattr(file_date, 'date'):
                                        file_date = file_date.date()
                                    if hasattr(inspection_date, 'date'):
                                        inspection_date = inspection_date.date()

                                    days_diff = abs((file_date - inspection_date).days)

                                    if days_diff <= 15 and days_diff < best_days_diff:
                                        best_match = file_info
                                        best_days_diff = days_diff

                            if best_match:
                                print(f"📥 Downloading: {best_match['name']} for {inspection.client_name}")

                                # Download to client's compliance folder
                                downloaded_path = download_compliance_document(
                                    best_match['file_id'],
                                    account_code,
                                    inspection.commodity,
                                    inspection.date_of_inspection,
                                    best_match['name'],
                                    inspection.client_name,
                                    None  # No request object needed
                                )

                                if downloaded_path:
                                    print(f"[OK] Downloaded successfully: {best_match['name']} -> {downloaded_path}")
                                    documents_processed += 1
                                else:
                                    print(f"[ERROR] Download failed for: {best_match['name']}")
                            else:
                                print(f"[WARN]  Could not find matching file for download (Account: {account_code}, Commodity: {commodity_prefix})")

                        except Exception as download_error:
                            print(f"[ERROR] Download error for {inspection.id}: {download_error}")

                        # Mark as processed only after successful download attempt
                        self.add_to_processed_cache(document_id)
                    else:
                        print(f"[WARN]  No document found for {inspection.id} (Account: {account_code})")
                    
                    # Small delay to prevent overwhelming the system
                    time.sleep(0.2)  # Slightly longer delay for download operations
                    
                except Exception as e:
                    print(f"[ERROR] Error processing {inspection.id}: {e}")
                    continue
            
            # Update statistics
            self.sync_stats['total_documents_processed'] += documents_processed
            self.sync_stats['documents_skipped'] += documents_skipped
            self.sync_stats['documents_processed'] += documents_processed
            self.sync_stats['last_sync_time'] = datetime.now()
            
            # Update last processed date
            settings.compliance_last_processed_date = datetime.now()
            settings.save()
            
            print(f"[OK] Daily compliance sync completed!")
            print(f"📊 Processed: {documents_processed}, Skipped: {documents_skipped}")

        except Exception as e:
            print(f"[ERROR] Error in daily compliance sync: {e}")
        finally:
            # Restore original is_running state
            self.is_running = was_running

    def _auto_restart_if_needed(self):
        """Auto-restart service if it was running before Django reloaded."""
        try:
            was_running = cache.get('daily_compliance_sync:running', False)
            if was_running:
                # Don't print on every page load - only on actual restart
                if not self.sync_thread or not self.sync_thread.is_alive():
                    print("Auto-restarting daily compliance sync (was running before)...")
                    self.is_running = True

                    # Reset global stop flag
                    import threading
                    if not hasattr(threading, '_global_stop_flag'):
                        threading._global_stop_flag = threading.Event()
                    threading._global_stop_flag.clear()

                    self.sync_thread = threading.Thread(target=self._run_daily_sync_loop, daemon=True)
                    self.sync_thread.start()
                    print("Daily compliance sync auto-restarted successfully")
        except Exception as e:
            print(f"WARNING: Failed to auto-restart daily compliance sync: {e}")

    def start_daily_sync(self, manual_start=False):
        """Start the daily sync service."""
        # Check if already running via cache (persistent across page refreshes)
        if cache.get('daily_compliance_sync:running'):
            if self.sync_thread and self.sync_thread.is_alive():
                print("WARNING: Daily compliance sync is already running.")
                return
            # Thread died but cache says running - restart it
            print("WARNING: Service was marked running but thread died. Restarting...")

        self.is_running = True
        self.manual_start = manual_start  # Store manual start flag
        # Increase cache TTL to 7 days (604800 seconds) for true persistence
        cache.set('daily_compliance_sync:running', True, 604800)

        # Reset global stop flag
        import threading
        if not hasattr(threading, '_global_stop_flag'):
            threading._global_stop_flag = threading.Event()
        threading._global_stop_flag.clear()

        self.sync_thread = threading.Thread(target=self._run_daily_sync_loop, daemon=True)
        self.sync_thread.start()
        print("START: Daily compliance sync service started.")
    
    def stop_daily_sync(self):
        """Stop the daily sync service."""
        print("STOP: Stopping daily compliance sync service...")
        self.is_running = False
        # Clear cache to prevent auto-restart
        cache.delete('daily_compliance_sync:running')

        # Force stop any ongoing operations
        if hasattr(self, 'manual_start'):
            self.manual_start = False
        
        # Set a stop timestamp for more aggressive checking
        self.stop_requested_at = time.time()
        
        # Force stop the processing immediately
        self._force_stop_processing = True
        
        # Set global stop flag for Google Drive service
        import threading
        if not hasattr(threading, '_global_stop_flag'):
            threading._global_stop_flag = threading.Event()
        threading._global_stop_flag.set()
        
        if self.sync_thread and self.sync_thread.is_alive():
            print("Waiting for sync thread to finish...")
            self.sync_thread.join(timeout=1)  # Very short timeout

            if self.sync_thread.is_alive():
                print("WARNING: Sync thread did not stop gracefully, forcing stop...")
                # Force stop all processing
                self._force_stop_processing = True
                print("Service marked as stopped - thread will exit on next check")

        print("Daily compliance sync service stopped.")
    
    def _run_daily_sync_loop(self):
        """Main loop for daily sync service."""
        while self.is_running and not (hasattr(self, '_force_stop_processing') and self._force_stop_processing):
            # Check global stop flag
            import threading
            if hasattr(threading, '_global_stop_flag') and threading._global_stop_flag.is_set():
                print("Global stop flag detected in main loop - stopping")
                break

            try:
                # Check if we should run daily sync (use manual_start flag if available)
                manual_start = getattr(self, 'manual_start', False)
                if self.should_run_daily_sync(manual_start):
                    print("STARTING: Daily compliance document sync...")
                    self.process_compliance_documents()
                    # Reset manual start flag after first run
                    if manual_start:
                        self.manual_start = False
                
                # Check stop flag more frequently during wait
                wait_time = 0
                while wait_time < 3600 and self.is_running and not (hasattr(self, '_force_stop_processing') and self._force_stop_processing):  # 1 hour total
                    # Check global stop flag
                    import threading
                    if hasattr(threading, '_global_stop_flag') and threading._global_stop_flag.is_set():
                        print("STOP: Global stop flag detected during wait - stopping")
                        break
                    time.sleep(60)  # Check every minute
                    wait_time += 60
                
            except Exception as e:
                print(f"ERROR: Error in daily sync loop: {e}")
                # Check stop flag during error recovery too
                wait_time = 0
                while wait_time < 300 and self.is_running and not (hasattr(self, '_force_stop_processing') and self._force_stop_processing):  # 5 minutes total
                    # Check global stop flag
                    import threading
                    if hasattr(threading, '_global_stop_flag') and threading._global_stop_flag.is_set():
                        print("STOP: Global stop flag detected during error recovery - stopping")
                        break
                    time.sleep(30)  # Check every 30 seconds
                    wait_time += 30
    
    def get_status(self):
        """Get current status of the daily sync service."""
        return {
            'is_running': self.is_running,
            'last_sync_time': self.sync_stats['last_sync_time'].isoformat() if self.sync_stats['last_sync_time'] else None,
            'total_documents_processed': self.sync_stats['total_documents_processed'],
            'documents_skipped': self.sync_stats['documents_skipped'],
            'documents_processed': self.sync_stats['documents_processed']
        }


# Global instance
daily_sync_service = DailyComplianceSyncService()

