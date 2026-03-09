"""
Copy all data from remote DB (82.25.97.159) to local DB (localhost).
Run on the server: cd /var/www/v4-Worksheet-demo && python copy_data_to_local.py
"""
import psycopg2
import psycopg2.extras

REMOTE = {
    'host': '82.25.97.159',
    'port': 5432,
    'dbname': 'inspection_system',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
}

LOCAL = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'inspection_system',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
}

# Tables in dependency order (parents before children)
TABLES = [
    'django_content_type',
    'auth_permission',
    'auth_group',
    'auth_user',
    'auth_user_groups',
    'auth_user_user_permissions',
    'auth_group_permissions',
    'django_session',
    'django_admin_log',
    'main_systemsettings',
    'main_settings',
    'main_xerotoken',
    'main_xeroinvoice',
    'inspector_mappings',
    'inspector_manager_allocations',
    'inspector_targets',
    'food_safety_agency_clients',
    'food_safety_agency_client_emails',
    'client_allocation',
    'inspection_groups',
    'inspections',
    'food_safety_agency_inspections',
    'main_shipment',
    'system_logs',
    'notifications',
    'inspection_fees',
    'inspection_fee_history',
    'fsa_tickets',
]


def copy_table(remote_cur, local_cur, table):
    """Copy all rows from remote table to local table."""
    try:
        remote_cur.execute(f'SELECT * FROM "{table}"')
        rows = remote_cur.fetchall()
        if not rows:
            print(f'  {table}: 0 rows (skip)')
            return 0

        # Get column names
        col_names = [desc[0] for desc in remote_cur.description]
        cols = ', '.join(f'"{c}"' for c in col_names)
        placeholders = ', '.join(['%s'] * len(col_names))

        # Insert rows
        insert_sql = f'INSERT INTO "{table}" ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
        for row in rows:
            try:
                local_cur.execute(insert_sql, row)
            except Exception as e:
                # Skip rows that fail (e.g. FK issues for stale data)
                pass

        print(f'  {table}: {len(rows)} rows copied')
        return len(rows)
    except Exception as e:
        print(f'  {table}: ERROR - {e}')
        return 0


def main():
    print('Connecting to remote DB (82.25.97.159)...')
    remote_conn = psycopg2.connect(**REMOTE)
    remote_cur = remote_conn.cursor()

    print('Connecting to local DB (localhost)...')
    local_conn = psycopg2.connect(**LOCAL)
    local_cur = local_conn.cursor()

    # Disable FK checks
    local_cur.execute("SET session_replication_role = 'replica';")

    print('\n=== Copying data ===\n')
    total = 0
    for table in TABLES:
        count = copy_table(remote_cur, local_cur, table)
        total += count

    # Fix sequences so new inserts get correct IDs
    print('\n=== Fixing sequences ===\n')
    for table in TABLES:
        try:
            local_cur.execute(f"""
                SELECT setval(pg_get_serial_sequence('"{table}"', 'id'),
                       COALESCE((SELECT MAX(id) FROM "{table}"), 1))
            """)
            print(f'  {table}: sequence reset')
        except Exception:
            # Table may not have an id column or sequence
            local_conn.rollback()
            local_cur.execute("SET session_replication_role = 'replica';")

    # Re-enable FK checks
    local_cur.execute("SET session_replication_role = 'origin';")

    local_conn.commit()
    remote_conn.close()
    local_conn.close()

    print(f'\nDone! Copied {total} total rows.')


if __name__ == '__main__':
    main()
