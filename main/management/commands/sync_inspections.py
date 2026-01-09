from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from main.services.google_sheets_service import GoogleSheetsService
from main.models import InspectorMapping, Inspection


class Command(BaseCommand):
    help = 'Sync inspections from SQL Server'

    def handle(self, *args, **options):
        self.stdout.write("Starting inspection sync...")
        
        try:
            # Create a mock request object
            class MockRequest:
                def __init__(self):
                    # Try to get any superuser, fallback to first user, or None
                    superusers = User.objects.filter(is_superuser=True)
                    if superusers.exists():
                        self.user = superusers.first()
                    elif User.objects.exists():
                        self.user = User.objects.first()
                    else:
                        # Create a temporary admin user for sync
                        self.user = User.objects.create_superuser(
                            username='admin',
                            email='admin@example.com',
                            password='admin123'
                        )
                    self.session = {}
                    self.method = 'POST'
                    self.headers = {}

                def session_set_expiry(self, timeout):
                    pass

                def session_save(self):
                    pass

            request = MockRequest()
            self.stdout.write(f"Using user: {request.user.username}")
            
            # Initialize Google Sheets Service
            sheets_service = GoogleSheetsService()
            
            # Run the sync
            result = sheets_service.populate_inspections_table(request)
            
            if result.get('success'):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Sync completed successfully! "
                        f"Created: {result['inspections_created']} inspections"
                    )
                )
                
                # Now find the correct inspector ID for LWANDILE MAQINA
                self.stdout.write("\nLooking for LWANDILE MAQINA in inspection data...")
                inspections = Inspection.objects.filter(inspector__icontains='LWANDILE MAQINA')
                
                if inspections.exists():
                    inspector_id = inspections.first().inspector_id
                    self.stdout.write(f"Found LWANDILE MAQINA with inspector_id: {inspector_id}")
                    
                    # Update the mapping
                    mapping, created = InspectorMapping.objects.get_or_create(
                        inspector_name='LWANDILE MAQINA',
                        defaults={'inspector_id': inspector_id, 'is_active': True}
                    )
                    
                    if not created:
                        mapping.inspector_id = inspector_id
                        mapping.save()
                        self.stdout.write(f"Updated mapping: LWANDILE MAQINA -> ID {inspector_id}")
                    else:
                        self.stdout.write(f"Created mapping: LWANDILE MAQINA -> ID {inspector_id}")
                else:
                    self.stdout.write("No inspections found for LWANDILE MAQINA")
                    
            else:
                self.stdout.write(
                    self.style.ERROR(f"Sync failed: {result.get('error', 'Unknown error')}")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error during sync: {str(e)}")
            )
