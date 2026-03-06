"""
Django management command to sync data from production MySQL (master branch) - READ-ONLY
"""

from django.core.management.base import BaseCommand
import pymysql
from main.models import FoodSafetyAgencyInspection
from datetime import datetime

class Command(BaseCommand):
    help = 'Sync inspection data from production MySQL database (READ-ONLY)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=500,
            help='Limit number of inspections to sync (default: 500)'
        )

    def handle(self, *args, **options):
        limit = options['limit']

        self.stdout.write(self.style.SUCCESS(f'🔄 Syncing latest {limit} inspections from production MySQL...'))

        try:
            # Connect to production MySQL (READ-ONLY)
            conn = pymysql.connect(
                host='167.88.43.168',
                port=3306,
                user='v4_user',
                password='V4_Secure@2024!',
                database='v4_worksheet',
                read_timeout=30
            )
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            self.stdout.write('✅ Connected to production MySQL')

            # Fetch latest inspections
            query = f"""
                SELECT *
                FROM food_safety_agency_inspections
                ORDER BY date_of_inspection DESC, id DESC
                LIMIT {limit}
            """

            cursor.execute(query)
            rows = cursor.fetchall()

            self.stdout.write(f'  Fetched {len(rows)} records from production')

            # Build lookup keys for existing records
            # Note: Occurrence reports may have empty commodity, so handle them separately
            lookup_keys = []
            valid_rows = []
            for row in rows:
                remote_id = row.get('remote_id')
                commodity = row.get('commodity') or ''  # Empty string for null/empty commodity
                is_occurrence = row.get('is_occurrence_report')

                # Include if: has remote_id AND (has commodity OR is occurrence report)
                if remote_id and (commodity or is_occurrence):
                    lookup_keys.append((commodity, remote_id))
                    valid_rows.append(row)

            self.stdout.write(f'  Processing {len(valid_rows)} valid records...')

            # Fetch all existing inspections in one query
            existing_inspections = {
                (insp.commodity, insp.remote_id): insp
                for insp in FoodSafetyAgencyInspection.objects.filter(
                    commodity__in=[key[0] for key in lookup_keys],
                    remote_id__in=[key[1] for key in lookup_keys]
                )
            }

            self.stdout.write(f'  Found {len(existing_inspections)} existing records to update')

            # Separate records into create and update lists
            to_create = []
            to_update = []
            occurrence_reports = 0

            for row in valid_rows:
                commodity = row.get('commodity') or ''  # Empty string for null/empty commodity
                remote_id = row.get('remote_id')

                if row.get('is_occurrence_report'):
                    occurrence_reports += 1

                # Build inspection data
                inspection_data = {
                    'commodity': commodity,
                    'remote_id': remote_id,
                    'date_of_inspection': row.get('date_of_inspection'),
                    'start_of_inspection': row.get('start_of_inspection'),
                    'end_of_inspection': row.get('end_of_inspection'),
                    'inspector_id': row.get('inspector_id'),
                    'inspector_name': row.get('inspector_name'),
                    'client_name': row.get('client_name'),
                    'internal_account_code': row.get('internal_account_code'),
                    'latitude': row.get('latitude'),
                    'longitude': row.get('longitude'),
                    'is_sample_taken': row.get('is_sample_taken', False),
                    'bought_sample': row.get('bought_sample'),
                    'km_traveled': row.get('km_traveled'),
                    'hours': row.get('hours'),
                    'approved_status': row.get('approved_status'),
                    'comment': row.get('comment'),
                    'lab': row.get('lab'),
                    'town': row.get('town'),
                    'inspected': row.get('inspected', False),
                    'follow_up': row.get('follow_up', False),
                    'occurrence_report': row.get('occurrence_report', False),
                    'dispensation_application': row.get('dispensation_application', False),
                    'fat': row.get('fat', False),
                    'protein': row.get('protein', False),
                    'calcium': row.get('calcium', False),
                    'dna': row.get('dna', False),
                    'needs_retest': row.get('needs_retest'),
                    'is_occurrence_report': row.get('is_occurrence_report', False),
                    'registration_code': row.get('registration_code'),
                    'physical_address': row.get('physical_address'),
                    'telephone': row.get('telephone'),
                    'corporate_group': row.get('corporate_group'),
                    'group_type': row.get('group_type'),
                    'facility_type': row.get('facility_type'),
                    'is_manual': False,
                }

                # Check if exists
                if (commodity, remote_id) in existing_inspections:
                    # Update existing record
                    existing = existing_inspections[(commodity, remote_id)]
                    for key, value in inspection_data.items():
                        setattr(existing, key, value)
                    to_update.append(existing)
                else:
                    # Create new record
                    to_create.append(FoodSafetyAgencyInspection(**inspection_data))

            # Perform bulk operations
            total_created = 0
            total_updated = 0

            if to_create:
                self.stdout.write(f'  Creating {len(to_create)} new records...')
                FoodSafetyAgencyInspection.objects.bulk_create(to_create, batch_size=500)
                total_created = len(to_create)

            if to_update:
                self.stdout.write(f'  Updating {len(to_update)} existing records...')
                FoodSafetyAgencyInspection.objects.bulk_update(
                    to_update,
                    fields=[
                        'date_of_inspection', 'start_of_inspection', 'end_of_inspection',
                        'inspector_id', 'inspector_name', 'client_name', 'internal_account_code',
                        'latitude', 'longitude', 'is_sample_taken', 'bought_sample',
                        'km_traveled', 'hours', 'approved_status', 'comment', 'lab', 'town',
                        'inspected', 'follow_up', 'occurrence_report', 'dispensation_application',
                        'fat', 'protein', 'calcium', 'dna', 'needs_retest', 'is_occurrence_report',
                        'registration_code', 'physical_address', 'telephone', 'corporate_group',
                        'group_type', 'facility_type', 'is_manual'
                    ],
                    batch_size=500
                )
                total_updated = len(to_update)

            total_synced = total_created + total_updated

            conn.close()

            self.stdout.write(self.style.SUCCESS(f'\n✅ Sync completed!'))
            self.stdout.write(f'   Total synced: {total_synced}')
            self.stdout.write(f'   Created: {total_created}')
            self.stdout.write(f'   Updated: {total_updated}')
            self.stdout.write(f'   Occurrence reports: {occurrence_reports}')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to sync: {str(e)}'))
            raise
