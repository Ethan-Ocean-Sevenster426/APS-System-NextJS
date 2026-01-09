"""
Utility functions for fetching egg inspections from SQL Server
READ-ONLY - Does not modify database
"""

def get_egg_inspections_from_sql_server(limit=50, client_filter=None, date_from=None, date_to=None):
    """
    Fetch egg inspection records from SQL Server (PoultryEggInspectionRecords)

    Args:
        limit: Maximum number of inspections to return
        client_filter: Filter by client name (partial match)
        date_from: Filter by date from (datetime or string)
        date_to: Filter by date to (datetime or string)

    Returns:
        List of egg inspection dictionaries with product details
    """
    from main.utils.sql_server_utils import SQLServerConnection
    from datetime import datetime, timedelta

    sql_conn = SQLServerConnection()
    if not sql_conn.connect():
        print("[ERROR] Failed to connect to SQL Server for egg inspections")
        return []

    try:
        cursor = sql_conn.connection.cursor()

        # Build WHERE clause
        where_clauses = ["pe.IsActive = 1"]

        if client_filter:
            where_clauses.append(f"c.Name LIKE '%{client_filter}%'")

        if date_from:
            if isinstance(date_from, str):
                where_clauses.append(f"pe.DateOfInspection >= '{date_from}'")
            else:
                where_clauses.append(f"pe.DateOfInspection >= '{date_from.strftime('%Y-%m-%d')}'")

        if date_to:
            if isinstance(date_to, str):
                where_clauses.append(f"pe.DateOfInspection <= '{date_to}'")
            else:
                where_clauses.append(f"pe.DateOfInspection <= '{date_to.strftime('%Y-%m-%d')}'")

        # Default: last 60 days if no date filters
        if not date_from and not date_to:
            sixty_days_ago = (datetime.now() - timedelta(days=60)).date()
            where_clauses.append(f"pe.DateOfInspection >= '{sixty_days_ago}'")

        where_clause = " AND ".join(where_clauses)

        # Query egg inspections with client and quality data
        query = f"""
            SELECT TOP {limit}
                pe.Id,
                pe.DateOfInspection,
                c.Name as ClientName,
                c.InternalAccountNumber,
                pe.ClientBranch,
                pe.EggProducer,
                pe.SizeId,
                pe.GradeId,
                pe.BatchNumber,
                pe.BBDate,
                pe.AverageWeight,
                pe.AverageHaugh,
                pe.InspectorId,
                pe.GeneralComments,
                pe.IsApproved,
                pe.CreatedOn
            FROM PoultryEggInspectionRecords pe
            LEFT JOIN Clients c ON pe.ClientId = c.Id
            WHERE {where_clause}
            ORDER BY pe.DateOfInspection DESC, pe.Id DESC
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        egg_inspections = []
        for row in rows:
            inspection = {
                'id': row[0],
                'date_of_inspection': row[1],
                'client_name': row[2] or 'Unknown Client',
                'client_account': row[3] or '',
                'client_branch': row[4] or '',
                'egg_producer': row[5] or 'Not specified',
                'size_id': row[6],
                'grade_id': row[7],
                'batch_number': row[8] or '',
                'best_before_date': row[9] or '',
                'average_weight': float(row[10]) if row[10] else 0.0,
                'average_haugh': float(row[11]) if row[11] else 0.0,
                'inspector_id': row[12],
                'comments': row[13] or '',
                'is_approved': row[14],
                'created_on': row[15],
                'commodity': 'EGGS',  # Always eggs
                'product_name': f"{row[5] or 'Eggs'} - Size:{row[6]} Grade:{row[7]}"  # Friendly product name
            }

            # Get quality check samples for this inspection
            quality_samples = get_egg_quality_samples(cursor, row[0])
            inspection['quality_samples'] = quality_samples
            inspection['quality_sample_count'] = len(quality_samples)

            egg_inspections.append(inspection)

        return egg_inspections

    except Exception as e:
        print(f"[ERROR] Failed to fetch egg inspections: {e}")
        import traceback
        traceback.print_exc()
        return []
    finally:
        sql_conn.disconnect()


def get_egg_quality_samples(cursor, inspection_id, limit=10):
    """
    Get quality check samples for an egg inspection

    Args:
        cursor: Database cursor
        inspection_id: Egg inspection record ID
        limit: Max samples to return

    Returns:
        List of quality sample dictionaries
    """
    try:
        query = f"""
            SELECT TOP {limit}
                SampleNumber,
                WeightGrams,
                HaughReadingmm,
                HaughValue
            FROM PoultryEggQualityCheckListEntryTypes
            WHERE InspectionRecordId = {inspection_id}
            AND IsActive = 1
            ORDER BY SampleNumber
        """

        cursor.execute(query)
        rows = cursor.fetchall()

        samples = []
        for row in rows:
            samples.append({
                'sample_number': row[0],
                'weight_grams': float(row[1]) if row[1] else 0.0,
                'haugh_reading_mm': float(row[2]) if row[2] else 0.0,
                'haugh_value': float(row[3]) if row[3] else 0.0
            })

        return samples

    except Exception as e:
        print(f"[ERROR] Failed to fetch quality samples: {e}")
        return []


def get_egg_size_name(size_id):
    """Convert size ID to friendly name"""
    size_map = {
        1: 'Small',
        2: 'Medium',
        3: 'Large',
        4: 'Extra Large',
        5: 'Jumbo'
    }
    return size_map.get(size_id, f'Size {size_id}')


def get_egg_grade_name(grade_id):
    """Convert grade ID to friendly name"""
    grade_map = {
        1: 'Grade A',
        2: 'Grade B',
        3: 'Grade C'
    }
    return grade_map.get(grade_id, f'Grade {grade_id}')
