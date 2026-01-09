"""
Django management command to start the data sync background service
This starts the scheduled sync service that syncs SQL Server and Google Sheets
"""

from django.core.management.base import BaseCommand
from main.services.scheduled_sync_service import scheduled_sync_service


class Command(BaseCommand):
    help = 'Start the data sync background service (SQL Server + Google Sheets)'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 Starting data sync background service...')
        )

        try:
            success, message = scheduled_sync_service.start_background_service()

            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ {message}')
                )
                self.stdout.write(
                    self.style.SUCCESS('📊 Service is now running in the background')
                )
                self.stdout.write('   - SQL Server sync enabled')
                self.stdout.write('   - Google Sheets sync enabled')
                self.stdout.write('   - Runs automatically based on configured interval')
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ {message}')
                )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to start data sync service: {str(e)}')
            )
            raise
