"""
Lab Sample Sync Utility
Syncs lab sample data from SQL Server to Django database
"""

import pymssql
from django.conf import settings
from ..models import FoodSafetyAgencyInspection


def sync_lab_samples_for_inspection(inspection_id, cursor=None):
    """
    Sync lab sample data for a specific inspection from SQL Server.

    Args:
        inspection_id: The remote_id of the inspection to sync
        cursor: Optional SQL Server cursor (if already connected)

    Returns:
        dict: Summary of what was synced
    """
    close_connection = False
    conn = None

    try:
        # Connect to SQL Server if cursor not provided
        if cursor is None:
            sql_config = settings.DATABASES['sql_server']
            conn = pymssql.connect(
                server=sql_config['HOST'],
                port=sql_config['PORT'],
                user=sql_config['USER'],
                password=sql_config['PASSWORD'],
                database=sql_config['NAME']
            )
            cursor = conn.cursor(as_dict=True)
            close_connection = True

        # Get the Django inspection
        try:
            inspection = FoodSafetyAgencyInspection.objects.get(remote_id=inspection_id)
        except FoodSafetyAgencyInspection.DoesNotExist:
            return {'success': False, 'error': f'Inspection {inspection_id} not found in Django database'}

        # Initialize flags
        has_pmp_sample = False
        has_raw_sample = False
        has_fat_protein = False
        has_calcium = False

        # Check for PMP lab samples
        cursor.execute("""
            SELECT *
            FROM PMPInspectionLabSampleLinks
            WHERE InspectionId = %s AND IsActive = 1
        """, (inspection_id,))
        pmp_samples = cursor.fetchall()

        if pmp_samples:
            has_pmp_sample = True
            # For PMP samples, the presence of a record means fat/protein testing
            # (PMP = Processed Meat Products - always tested for fat and protein)
            has_fat_protein = True

        # Check for RAW lab samples
        cursor.execute("""
            SELECT *
            FROM RawRMPInspectionLabSampleLinks
            WHERE InspectionId = %s AND IsActive = 1
        """, (inspection_id,))
        raw_samples = cursor.fetchall()

        if raw_samples:
            has_raw_sample = True
            # Check CategoryTestingId to determine test types
            for sample in raw_samples:
                category_id = sample.get('CategoryTestingId')
                is_calcium = sample.get('IsCalcuimContentTestRequired', False)

                # CategoryTestingId 1 = Standard testing (fat + protein)
                # CategoryTestingId 2 = Extended testing (fat + protein + calcium)
                # CategoryTestingId 3 = DNA testing
                if category_id in [1, 2]:
                    has_fat_protein = True
                if category_id == 2 or is_calcium:
                    has_calcium = True

        # Update the inspection with lab sample data
        inspection.fat = has_fat_protein
        inspection.protein = has_fat_protein  # Fat and protein always go together
        inspection.calcium = has_calcium
        inspection.dna = False  # DNA testing is rare, would need specific CategoryTestingId
        inspection.save()

        return {
            'success': True,
            'inspection_id': inspection_id,
            'has_pmp_sample': has_pmp_sample,
            'has_raw_sample': has_raw_sample,
            'fat': has_fat_protein,
            'protein': has_fat_protein,
            'calcium': has_calcium,
            'dna': False
        }

    except Exception as e:
        return {
            'success': False,
            'inspection_id': inspection_id,
            'error': str(e)
        }
    finally:
        if close_connection and conn:
            conn.close()


def sync_all_lab_samples(limit=None, show_progress=True):
    """
    Sync lab sample data for all inspections from SQL Server.

    Args:
        limit: Optional limit on number of inspections to process
        show_progress: Whether to print progress updates

    Returns:
        dict: Summary statistics
    """
    try:
        # Connect to SQL Server
        sql_config = settings.DATABASES['sql_server']
        conn = pymssql.connect(
            server=sql_config['HOST'],
            port=sql_config['PORT'],
            user=sql_config['USER'],
            password=sql_config['PASSWORD'],
            database=sql_config['NAME']
        )
        cursor = conn.cursor(as_dict=True)

        # Get all inspections with lab samples
        cursor.execute("""
            SELECT DISTINCT InspectionId
            FROM (
                SELECT InspectionId FROM PMPInspectionLabSampleLinks WHERE IsActive = 1
                UNION
                SELECT InspectionId FROM RawRMPInspectionLabSampleLinks WHERE IsActive = 1
            ) AS AllSamples
            ORDER BY InspectionId DESC
        """)

        inspection_ids_with_samples = [row['InspectionId'] for row in cursor.fetchall()]

        if limit:
            inspection_ids_with_samples = inspection_ids_with_samples[:limit]

        if show_progress:
            print(f"\n[LAB SAMPLE SYNC] Found {len(inspection_ids_with_samples)} inspections with lab samples")
            print(f"[LAB SAMPLE SYNC] Starting sync...")

        stats = {
            'total': len(inspection_ids_with_samples),
            'success': 0,
            'failed': 0,
            'not_found': 0,
            'pmp_samples': 0,
            'raw_samples': 0
        }

        for idx, inspection_id in enumerate(inspection_ids_with_samples, 1):
            result = sync_lab_samples_for_inspection(inspection_id, cursor)

            if result['success']:
                stats['success'] += 1
                if result.get('has_pmp_sample'):
                    stats['pmp_samples'] += 1
                if result.get('has_raw_sample'):
                    stats['raw_samples'] += 1
            else:
                if 'not found' in result.get('error', '').lower():
                    stats['not_found'] += 1
                else:
                    stats['failed'] += 1

            # Progress updates
            if show_progress and idx % 100 == 0:
                print(f"[LAB SAMPLE SYNC] Progress: {idx}/{stats['total']} processed")

        conn.close()

        if show_progress:
            print(f"\n[LAB SAMPLE SYNC] Complete!")
            print(f"  [OK] Success: {stats['success']}")
            print(f"  [FAIL] Failed: {stats['failed']}")
            print(f"  [INFO] Not found in Django: {stats['not_found']}")
            print(f"  [PMP] PMP samples: {stats['pmp_samples']}")
            print(f"  [RAW] RAW samples: {stats['raw_samples']}")

        return stats

    except Exception as e:
        if show_progress:
            print(f"[LAB SAMPLE SYNC] Error: {e}")
        return {
            'success': False,
            'error': str(e)
        }
