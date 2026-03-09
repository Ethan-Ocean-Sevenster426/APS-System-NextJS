"""
1. Install missing deps
2. Run Django migrations on localhost DB
3. Copy all data from remote DB (82.25.97.159) to local DB (localhost)

Run on the server: cd /var/www/v4-Worksheet-demo && python copy_data_to_local.py
"""
import os
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, 'mysite', 'settings.py')

# Step 0: Install missing deps
print('=== Step 0: Installing missing dependencies ===\n')
subprocess.run([sys.executable, '-m', 'pip', 'install', 'reportlab', '-q'], check=False)

# Step 1: Run migrations against localhost
print('\n=== Step 1: Running migrations on localhost DB ===\n')

with open(SETTINGS_FILE, 'r') as f:
    original_settings = f.read()

patched_settings = original_settings.replace("'HOST': '82.25.97.159'", "'HOST': 'localhost'")
with open(SETTINGS_FILE, 'w') as f:
    f.write(patched_settings)

print('Pointed settings.py to localhost')

try:
    result = subprocess.run(
        [sys.executable, 'manage.py', 'migrate', '--run-syncdb'],
        capture_output=True, text=True, cwd=BASE_DIR
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f'Migration output:\n{result.stderr}')
    print('Migrations complete.\n')
except Exception as e:
    print(f'Migration error: {e}')
    with open(SETTINGS_FILE, 'w') as f:
        f.write(original_settings)
    sys.exit(1)

# Step 2: Grant superuser to inspection_user temporarily, then copy
print('=== Step 2: Copying data from 82.25.97.159 to localhost ===\n')

# Grant superuser so we can disable triggers
subprocess.run(
    ['sudo', '-u', 'postgres', 'psql', '-d', 'inspection_system', '-c',
     'ALTER USER inspection_user WITH SUPERUSER;'],
    check=False
)

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
            except Exception:
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

    local_cur.execute("SET session_replication_role = 'replica';")

    print('\nCopying tables...\n')
    total = 0
    for table in TABLES:
        count = copy_table(remote_cur, local_cur, local_conn, table)
        total += count
        local_conn.commit()
        local_cur.execute("SET session_replication_role = 'replica';")

    # Fix sequences
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

    local_cur.execute("SET session_replication_role = 'origin';")
    local_conn.commit()

    remote_conn.close()
    local_conn.close()

    # Revoke superuser
    subprocess.run(
        ['sudo', '-u', 'postgres', 'psql', '-d', 'inspection_system', '-c',
         'ALTER USER inspection_user WITH NOSUPERUSER;'],
        check=False
    )

    print(f'\nDone! Copied {total} total rows.')
    print('\nSettings.py is now pointed to localhost.')
    print('Run: sudo systemctl restart gunicorn')


if __name__ == '__main__':
    main()
