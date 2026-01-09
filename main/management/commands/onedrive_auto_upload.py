"""
Django management command for OneDrive automatic upload
Uploads inspection files to OneDrive after 3 days of being marked as sent
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from main.utils.onedrive_auto_upload import process_inspections_for_upload, get_upload_statistics


class Command(BaseCommand):
    help = 'Upload inspection files to OneDrive after 3 days of being marked as sent'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be uploaded without actually uploading',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show upload statistics',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force upload even if files were already uploaded',
        )

    def handle(self, *args, **options):
        if options['stats']:
            self.show_statistics()
            return

        if options['dry_run']:
            self.dry_run()
            return

        self.stdout.write(
            self.style.SUCCESS('🚀 Starting OneDrive auto-upload process...')
        )

        try:
            success = process_inspections_for_upload()
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS('✅ OneDrive auto-upload completed successfully!')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('⚠️ OneDrive auto-upload completed with some errors')
                )
                
        except Exception as e:
            raise CommandError(f'OneDrive auto-upload failed: {str(e)}')

    def dry_run(self):
        """Show what would be uploaded without actually uploading"""
        from main.utils.onedrive_auto_upload import get_inspections_ready_for_upload, group_inspections_by_month
        
        self.stdout.write(
            self.style.WARNING('🔍 DRY RUN - No files will be uploaded')
        )
        
        inspections = get_inspections_ready_for_upload()
        
        if not inspections.exists():
            self.stdout.write('ℹ️ No inspections ready for OneDrive upload')
            return
        
        self.stdout.write(f'📋 Found {inspections.count()} inspections ready for upload:')
        
        monthly_groups = group_inspections_by_month(inspections)
        
        for (year, month), month_inspections in monthly_groups.items():
            month_name = month_inspections[0].sent_date.strftime("%B") if month_inspections[0].sent_date else "Unknown"
            self.stdout.write(f'\n📁 {month:02d}/{year} ({month_name}) - {len(month_inspections)} inspections:')
            
            for inspection in month_inspections:
                sent_date = inspection.sent_date.strftime('%Y-%m-%d %H:%M') if inspection.sent_date else 'Unknown'
                self.stdout.write(f'  📄 {inspection.remote_id} - {inspection.client_name} (sent: {sent_date})')

    def show_statistics(self):
        """Show upload statistics"""
        stats = get_upload_statistics()
        
        self.stdout.write(
            self.style.SUCCESS('📊 OneDrive Upload Statistics')
        )
        self.stdout.write('=' * 50)
        self.stdout.write(f'Total inspections marked as sent: {stats["total_sent"]}')
        self.stdout.write(f'Total uploaded to OneDrive: {stats["total_uploaded"]}')
        self.stdout.write(f'Pending upload: {stats["pending_upload"]}')
        self.stdout.write(f'Upload completion: {stats["upload_percentage"]:.1f}%')
        
        if stats['pending_upload'] > 0:
            self.stdout.write(
                self.style.WARNING(f'\n⚠️ {stats["pending_upload"]} inspections are pending OneDrive upload')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n✅ All sent inspections have been uploaded to OneDrive')
            )
