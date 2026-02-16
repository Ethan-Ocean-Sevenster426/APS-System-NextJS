"""
Django management command to sync data from production SQL Server (READ-ONLY)
This pulls the latest inspection data for testing purposes
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import pymssql
from main.models import FoodSafetyAgencyInspection
from main.utils.sql_server_utils import fetch_product_names_for_inspection
from datetime import datetime

class Command(BaseCommand):
    help = 'Sync latest inspection data from production SQL Server (READ-ONLY)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Limit number of inspections to sync (default: 100)'
        )

    def handle(self, *args, **options):
        limit = options['limit']

        self.stdout.write(self.style.SUCCESS(f'🔄 Syncing latest {limit} inspections from production SQL Server...'))

        try:
            # Connect to SQL Server (READ-ONLY)
            sql_config = settings.DATABASES.get('sql_server', {})
            conn = pymssql.connect(
                server=sql_config.get('HOST'),
                port=int(sql_config.get('PORT', 1433)),
                user=sql_config.get('USER'),
                password=sql_config.get('PASSWORD'),
                database=sql_config.get('NAME'),
                timeout=30
            )
            cursor = conn.cursor(as_dict=True)

            self.stdout.write('✅ Connected to production SQL Server')

            # Fetch latest inspections from each commodity table
            total_synced = 0
            total_updated = 0
            total_created = 0

            # Sync from each commodity table
            commodities = [
                ('PMP', 'PMPInspectionRecordTypes'),
                ('POULTRY', 'PoultryInspectionRecordTypes'),
                ('RAW', 'RawRMPInspectionRecordTypes'),
                # EGGS table doesn't exist in SQL Server - eggs data is in Poultry
            ]

            for commodity, table_name in commodities:
                try:
                    # Query with basic columns that exist
                    query = f"""
                        SELECT TOP {limit // 3} *
                        FROM {table_name}
                        ORDER BY DateOfInspection DESC, Id DESC
                    """

                    cursor.execute(query)
                    rows = cursor.fetchall()

                    self.stdout.write(f'  Fetched {len(rows)} records from {commodity}')

                    for row in rows:
                        # Fetch product names from SQL Server product tables
                        try:
                            product_names = fetch_product_names_for_inspection(
                                inspection_id=row.get('Id')
                            )
                            product_name = ', '.join(product_names[:3]) if product_names else None  # Limit to 3 products
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f'  ⚠️ Could not fetch products for ID {row.get("Id")}: {e}'))
                            product_name = None

                        # Update or create inspection with available fields
                        inspection, created = FoodSafetyAgencyInspection.objects.update_or_create(
                            commodity=commodity,
                            remote_id=row.get('Id'),
                            defaults={
                                'date_of_inspection': row.get('DateOfInspection'),
                                'inspector_id': row.get('InspectorId'),
                                'latitude': str(row.get('Latitude')) if row.get('Latitude') else None,
                                'longitude': str(row.get('Longitude')) if row.get('Longitude') else None,
                                'is_sample_taken': row.get('IsSampleTaken', False),
                                'product_name': product_name,  # Auto-populate from SQL Server
                                'is_manual': False,  # Mark as synced from SQL Server
                            }
                        )

                        if created:
                            total_created += 1
                        else:
                            total_updated += 1
                        total_synced += 1

                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  ⚠️ Error syncing {commodity}: {e}'))

            conn.close()

            self.stdout.write(self.style.SUCCESS(f'\n✅ Sync completed!'))
            self.stdout.write(f'   Total synced: {total_synced}')
            self.stdout.write(f'   Created: {total_created}')
            self.stdout.write(f'   Updated: {total_updated}')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to sync: {str(e)}'))
            raise
