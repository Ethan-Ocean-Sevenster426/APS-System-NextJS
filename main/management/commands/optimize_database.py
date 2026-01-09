from django.core.management.base import BaseCommand
from django.db import connection
from django.db.models import Index
from main.models import FoodSafetyAgencyInspection, Client, ClientEmail


class Command(BaseCommand):
    help = 'Add database indexes for better performance with large datasets'

    def handle(self, *args, **options):
        self.stdout.write('Adding database indexes for performance optimization...')
        
        with connection.cursor() as cursor:
            # Add indexes for FoodSafetyAgencyInspection model
            self.stdout.write('Adding indexes to FoodSafetyAgencyInspection...')
            
            # Index for filtering by inspector
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_fsa_inspection_inspector_id 
                    ON food_safety_agency_inspections (inspector_id)
                """)
                self.stdout.write('✓ Added inspector_id index')
            except Exception as e:
                self.stdout.write(f'⚠ Inspector index error: {e}')
            
            # Index for filtering by client and date (most common query)
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_fsa_inspection_client_date 
                    ON food_safety_agency_inspections (client_name, date_of_inspection)
                """)
                self.stdout.write('✓ Added client_name + date_of_inspection index')
            except Exception as e:
                self.stdout.write(f'⚠ Client-date index error: {e}')
            
            # Index for filtering by sample taken
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_fsa_inspection_sample_taken 
                    ON food_safety_agency_inspections (is_sample_taken)
                """)
                self.stdout.write('✓ Added is_sample_taken index')
            except Exception as e:
                self.stdout.write(f'⚠ Sample taken index error: {e}')
            
            # Index for commodity filtering
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_fsa_inspection_commodity 
                    ON food_safety_agency_inspections (commodity)
                """)
                self.stdout.write('✓ Added commodity index')
            except Exception as e:
                self.stdout.write(f'⚠ Commodity index error: {e}')
            
            # Index for inspector name filtering
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_fsa_inspection_inspector_name 
                    ON food_safety_agency_inspections (inspector_name)
                """)
                self.stdout.write('✓ Added inspector_name index')
            except Exception as e:
                self.stdout.write(f'⚠ Inspector name index error: {e}')
            
            # Index for Client model
            self.stdout.write('Adding indexes to Client...')
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_client_client_id 
                    ON food_safety_agency_clients (client_id)
                """)
                self.stdout.write('✓ Added client_id index')
            except Exception as e:
                self.stdout.write(f'⚠ Client ID index error: {e}')
            
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_client_name 
                    ON food_safety_agency_clients (name)
                """)
                self.stdout.write('✓ Added client name index')
            except Exception as e:
                self.stdout.write(f'⚠ Client name index error: {e}')
            
            # Index for ClientEmail model
            self.stdout.write('Adding indexes to ClientEmail...')
            try:
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_clientemail_client_id 
                    ON food_safety_agency_client_emails (client_id)
                """)
                self.stdout.write('✓ Added client_id index for emails')
            except Exception as e:
                self.stdout.write(f'⚠ ClientEmail index error: {e}')
        
        self.stdout.write(self.style.SUCCESS('Database optimization completed!'))
        self.stdout.write('Performance should be significantly improved for large datasets.')
