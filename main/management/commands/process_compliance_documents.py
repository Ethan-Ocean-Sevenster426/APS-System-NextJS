from django.core.management.base import BaseCommand
from django.utils import timezone
from main.models import FoodSafetyAgencyInspection, Client, SystemLog
from main.views.core_views import (
    load_drive_files_real, 
    find_document_link_apps_script_replica, 
    normalize_client_name,
    download_compliance_document
)
from django.http import HttpRequest
from datetime import date
import time


class Command(BaseCommand):
    help = 'Background process to find and download compliance documents every 5 minutes'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--run-once',
            action='store_true',
            help='Run once instead of continuously',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of inspections to process per batch',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting compliance document background processor...')
        )
        
        run_once = options['run_once']
        batch_size = options['batch_size']
        
        if run_once:
            self.process_compliance_documents(batch_size)
        else:
            # Run continuously every 5 minutes
            while True:
                try:
                    self.process_compliance_documents(batch_size)
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Batch complete. Sleeping for 5 minutes...')
                    )
                    time.sleep(300)  # 5 minutes
                except KeyboardInterrupt:
                    self.stdout.write(
                        self.style.WARNING('⏹️ Background processor stopped by user')
                    )
                    break
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Error in background processor: {e}')
                    )
                    time.sleep(60)  # Wait 1 minute before retrying
    
    def process_compliance_documents(self, batch_size=100):
        """Process compliance documents for recent inspections."""
        start_time = timezone.now()
        
        try:
            # Get recent inspections (Jan 2025+)
            cutoff_date = date(2025, 1, 1)
            recent_cutoff = timezone.now().date() - timezone.timedelta(days=7)  # Last 7 days
            
            inspections = FoodSafetyAgencyInspection.objects.filter(
                date_of_inspection__gte=max(cutoff_date, recent_cutoff)
            ).order_by('-date_of_inspection')[:batch_size]
            
            total_inspections = inspections.count()
            self.stdout.write(f"📋 Processing {total_inspections} recent inspections...")
            
            if total_inspections == 0:
                self.stdout.write("ℹ️ No recent inspections to process")
                return
            
            # Build client mapping
            client_map = {}
            for client in Client.objects.exclude(internal_account_code__isnull=True).exclude(internal_account_code=''):
                key = normalize_client_name(client.client_id or '')
                if key:
                    client_map[key] = client.internal_account_code
            
            self.stdout.write(f"👥 Loaded {len(client_map)} clients with account codes")
            
            # Create fake request for Drive service
            request = HttpRequest()
            request.user = None  # Background process
            
            # Load Drive files
            self.stdout.write("☁️ Loading Drive files...")
            file_lookup = load_drive_files_real(request)
            self.stdout.write(f"📁 Loaded {len(file_lookup)} Drive files")
            
            # Process inspections
            processed_count = 0
            downloaded_count = 0
            error_count = 0
            
            for inspection in inspections:
                try:
                    processed_count += 1
                    
                    # Get client account code
                    client_key = normalize_client_name(inspection.client_name or '')
                    account_code = client_map.get(client_key, '')
                    
                    if account_code:
                        # Find document link
                        document_link = find_document_link_apps_script_replica(
                            account_code,
                            inspection.commodity,
                            inspection.date_of_inspection,
                            file_lookup
                        )
                        
                        # If link found, download to compliance folder
                        if document_link and '<a href=' in document_link:
                            # Find the matching file in lookup (by account code only)
                            for file_key, file_info in file_lookup.items():
                                if file_info['accountCode'] == account_code:
                                    
                                    # Download to client's compliance folder
                                    downloaded_path = download_compliance_document(
                                        file_info['file_id'],
                                        account_code,
                                        inspection.commodity,
                                        inspection.date_of_inspection,
                                        file_info['name'],
                                        inspection.client_name,
                                        request
                                    )
                                    
                                    if downloaded_path:
                                        downloaded_count += 1
                                        self.stdout.write(f"📥 Downloaded: {file_info['name']} -> {downloaded_path}")
                                    break
                
                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f"❌ Error processing inspection {inspection.remote_id}: {e}")
                    )
            
            # Log results
            processing_time = (timezone.now() - start_time).total_seconds()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"✅ Batch complete: {processed_count} processed, "
                    f"{downloaded_count} downloaded, {error_count} errors "
                    f"in {processing_time:.1f}s"
                )
            )
            
            # Log to system only if there was actual activity (downloads or errors)
            if downloaded_count > 0 or error_count > 0:
                from django.contrib.auth.models import User
                system_user = User.objects.get(username='developer')
                SystemLog.log_activity(
                    user=system_user,
                    action='SYNC',
                    page='compliance_background',
                    description=f'Compliance document background processing: {downloaded_count} documents downloaded',
                    details={
                        'processed': processed_count,
                        'downloaded': downloaded_count,
                        'errors': error_count,
                        'processing_time': processing_time
                    }
                )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Fatal error in compliance processing: {e}")
            )
            raise
