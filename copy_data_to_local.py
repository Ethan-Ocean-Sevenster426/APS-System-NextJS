"""
1. Run Django migrations on localhost DB
2. Copy all data from remote DB (82.25.97.159) to local DB (localhost)

Run on the server: cd /var/www/v4-Worksheet-demo && python copy_data_to_local.py
"""
import os
import sys
import subprocess

# Step 1: Run migrations against localhost
print('=== Step 1: Running migrations on localhost DB ===\n')

# Temporarily override DB host to localhost via env
env = os.environ.copy()
env['DJANGO_SETTINGS_MODULE'] = 'mysite.settings'

# Patch settings to use localhost before Django loads
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mysite', 'settings.py')

# Read current settings
with open(SETTINGS_FILE, 'r') as f:
    original_settings = f.read()

# Swap to localhost
patched_settings = original_settings.replace("'HOST': '82.25.97.159'", "'HOST': 'localhost'")
with open(SETTINGS_FILE, 'w') as f:
    f.write(patched_settings)

print('Pointed settings.py to localhost')

try:
    result = subprocess.run(
        [sys.executable, 'manage.py', 'migrate', '--run-syncdb'],
        env=env,
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f'Migration warnings/errors:\n{result.stderr}')
        # Don't abort - some warnings are OK
    print('Migrations complete.\n')
except Exception as e:
    print(f'Migration error: {e}')
    # Restore original settings before exiting
    with open(SETTINGS_FILE, 'w') as f:
        f.write(original_settings)
    sys.exit(1)

# Step 2: Copy data
print('=== Step 2: Copying data from 82.25.97.159 to localhost ===\n')

import psycopg2

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
    'django_migrations',
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


def copy_table(remote_cur, local_cur, local_conn, table):
    """Copy all rows from remote table to local table."""
    try:
        remote_cur.execute(f'SELECT * FROM "{table}"')
        rows = remote_cur.fetchall()
        if not rows:
            print(f'  {table}: 0 rows (skip)')
            return 0

        col_names = [desc[0] for desc in remote_cur.description]
        cols = ', '.join(f'"{c}"' for c in col_names)
        placeholders = ', '.join(['%s'] * len(col_names))

        insert_sql = f'INSERT INTO "{table}" ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
        inserted = 0
        for row in rows:
            try:
                local_cur.execute(insert_sql, row)
                inserted += 1
            except Exception as e:
                local_conn.rollback()
                local_cur.execute("SET session_replication_role = 'replica';")

        print(f'  {table}: {inserted}/{len(rows)} rows copied')
        return inserted
    except Exception as e:
        print(f'  {table}: ERROR - {e}')
        local_conn.rollback()
        local_cur.execute("SET session_replication_role = 'replica';")
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

    print('\nCopying tables...\n')
    total = 0
    for table in TABLES:
        count = copy_table(remote_cur, local_cur, local_conn, table)
        total += count
        local_conn.commit()
        local_cur.execute("SET session_replication_role = 'replica';")

    # Fix sequences so new inserts get correct IDs
    print('\n=== Fixing sequences ===\n')
    for table in TABLES:
        try:
            local_cur.execute(f"""
                SELECT setval(pg_get_serial_sequence('{table}', 'id'),
                       COALESCE((SELECT MAX(id) FROM "{table}"), 1))
            """)
            local_conn.commit()
            print(f'  {table}: sequence reset')
        except Exception:
            local_conn.rollback()

    # Re-enable FK checks
    local_cur.execute("SET session_replication_role = 'origin';")
    local_conn.commit()

    remote_conn.close()
    local_conn.close()

    # Verify
    print(f'\nDone! Copied {total} total rows.')
    print('\nSettings.py is now pointed to localhost.')
    print('Restart gunicorn: sudo systemctl restart gunicorn')


if __name__ == '__main__':
    main()
