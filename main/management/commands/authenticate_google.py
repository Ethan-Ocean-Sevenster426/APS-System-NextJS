"""
Management command to authenticate with Google Sheets and Drive.
This will generate the token.pickle file needed for API access.
"""
from django.core.management.base import BaseCommand
from main.services.google_sheets_service import GoogleSheetsService
from main.services.google_drive_service import GoogleDriveService


class Command(BaseCommand):
    help = 'Authenticate with Google Sheets and Drive APIs'

    def add_arguments(self, parser):
        parser.add_argument(
            '--service',
            type=str,
            default='both',
            choices=['sheets', 'drive', 'both'],
            help='Which service to authenticate (default: both)'
        )

    def handle(self, *args, **options):
        service_type = options['service']

        self.stdout.write(self.style.WARNING('\n' + '='*80))
        self.stdout.write(self.style.WARNING('Google API Authentication'))
        self.stdout.write(self.style.WARNING('='*80 + '\n'))

        try:
            if service_type in ['sheets', 'both']:
                self.stdout.write(self.style.NOTICE('Authenticating with Google Sheets API...'))
                sheets_service = GoogleSheetsService()
                sheets_service.authenticate()
                self.stdout.write(self.style.SUCCESS('[SUCCESS] Google Sheets authentication successful!\n'))

            if service_type in ['drive', 'both']:
                self.stdout.write(self.style.NOTICE('Authenticating with Google Drive API...'))
                drive_service = GoogleDriveService()
                drive_service.authenticate()
                self.stdout.write(self.style.SUCCESS('[SUCCESS] Google Drive authentication successful!\n'))

            self.stdout.write(self.style.SUCCESS('='*80))
            self.stdout.write(self.style.SUCCESS('Authentication completed successfully!'))
            self.stdout.write(self.style.SUCCESS('Your credentials have been saved and the application can now access Google APIs.'))
            self.stdout.write(self.style.SUCCESS('='*80 + '\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n[ERROR] Authentication failed: {str(e)}\n'))
            self.stdout.write(self.style.ERROR('Please check:'))
            self.stdout.write(self.style.ERROR('1. credentials.json file exists in the project root'))
            self.stdout.write(self.style.ERROR('2. You have a working internet connection'))
            self.stdout.write(self.style.ERROR('3. The credentials.json file is valid'))
            raise
