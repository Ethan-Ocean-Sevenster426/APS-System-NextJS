"""
Migrate all data from MySQL (v4_worksheet) to PostgreSQL (v4_worksheet_prod).
Both databases are on 167.88.43.168.

Run: python migrate_mysql_to_pg.py
"""
import pymysql
import psycopg2
import sys

MYSQL = {
    'host': '167.88.43.168',
    'user': 'v4_user',
    'password': 'V4_Secure@2024!',
    'database': 'v4_worksheet',
    'port': 3306,
    'charset': 'utf8mb4',
}

PG = {
    'host': '167.88.43.168',
    'user': 'v4_prod_user',
    'password': 'V4ProdSecure2026',
    'dbname': 'v4_worksheet_prod',
    'port': 5432,
}

# FK-safe order: parents first
TABLES = [
    'django_content_type',
    'auth_group',
    'auth_permission',
    'auth_user',
    'auth_group_permissions',
    'auth_user_groups',
    'auth_user_user_permissions',
    'django_admin_log',
    'django_session',
    'food_safety_agency_clients',
    'food_safety_agency_client_emails',
    'inspection_groups',
    'food_safety_agency_inspections',
    'inspections',
    'inspection_fees',
    'inspection_fee_history',
    'inspector_mappings',
    'inspector_manager_allocations',
    'client_allocation',
    'fsa_tickets',
    'notifications',
    'system_logs',
    'main_settings',
    'main_shipment',
    'main_systemsettings',
]


def get_columns(mycur, table):
    mycur.execute(f"SHOW COLUMNS FROM `{table}`")
    return [row[0] for row in mycur.fetchall()]


def get_pg_columns(pgcur, table):
    pgcur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
        ORDER BY ordinal_position
    """, (table,))
    return [row[0] for row in pgcur.fetchall()]


def get_pg_bool_columns(pgcur, table):
    pgcur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND table_schema = 'public'
          AND data_type = 'boolean'
    """, (table,))
    return set(row[0] for row in pgcur.fetchall())


def migrate_table(mycur, pgcur, pg_conn, table):
    mysql_cols = get_columns(mycur, table)
    pg_cols = get_pg_columns(pgcur, table)

    # Only copy columns that exist in both
    common = [c for c in mysql_cols if c in pg_cols]
    if not common:
        print(f"  SKIP - no common columns")
        return 0

    # Find boolean columns in PG so we can cast MySQL int -> bool
    bool_cols = get_pg_bool_columns(pgcur, table)
    bool_indexes = [i for i, c in enumerate(common) if c in bool_cols]

    # Find unique columns — empty strings must become NULL to avoid constraint violations
    pgcur.execute("""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = %s::regclass AND i.indisunique
    """, (table,))
    unique_cols = set(row[0] for row in pgcur.fetchall())
    unique_indexes = [i for i, c in enumerate(common) if c in unique_cols]

    # Read from MySQL
    col_list = ', '.join(f'`{c}`' for c in common)
    mycur.execute(f"SELECT {col_list} FROM `{table}`")
    rows = mycur.fetchall()

    if not rows:
        print(f"  0 rows")
        return 0

    # Clear PG table
    pgcur.execute(f'DELETE FROM "{table}"')

    # Insert
    pg_col_list = ', '.join(f'"{c}"' for c in common)
    placeholders = ', '.join(['%s'] * len(common))
    insert_sql = f'INSERT INTO "{table}" ({pg_col_list}) VALUES ({placeholders})'

    batch_size = 500
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        cleaned = []
        for row in batch:
            cleaned_row = []
            for j, val in enumerate(row):
                if isinstance(val, bytes):
                    try:
                        val = val.decode('utf-8')
                    except UnicodeDecodeError:
                        val = val.decode('latin-1')
                if j in bool_indexes and isinstance(val, int):
                    val = bool(val)
                # Empty strings in unique columns -> NULL
                if j in unique_indexes and val == '':
                    val = None
                cleaned_row.append(val)
            cleaned.append(tuple(cleaned_row))
        pgcur.executemany(insert_sql, cleaned)
        inserted += len(batch)

    pg_conn.commit()

    # Fix auto-increment sequences
    if 'id' in common:
        try:
            pgcur.execute(f"""
                SELECT setval(pg_get_serial_sequence('{table}', 'id'),
                       COALESCE((SELECT MAX(id) FROM "{table}"), 1))
            """)
            pg_conn.commit()
        except Exception:
            pg_conn.rollback()

    print(f"  {inserted} rows")
    return inserted


def main():
    print("=" * 60)
    print(" MySQL -> PostgreSQL Data Migration")
    print("=" * 60)

    print("\nConnecting to MySQL...", flush=True)
    my_conn = pymysql.connect(**MYSQL)
    mycur = my_conn.cursor()
    print("  OK")

    print("Connecting to PostgreSQL...", flush=True)
    pg_conn = psycopg2.connect(**PG)
    pgcur = pg_conn.cursor()
    print("  OK")

    # Disable FK checks
    pgcur.execute("SET session_replication_role = 'replica';")
    pg_conn.commit()

    total = 0
    errors = []

    print(f"\nMigrating {len(TABLES)} tables:\n")

    for i, table in enumerate(TABLES, 1):
        print(f"  [{i}/{len(TABLES)}] {table}...", end=" ", flush=True)
        try:
            count = migrate_table(mycur, pgcur, pg_conn, table)
            total += count
        except Exception as e:
            pg_conn.rollback()
            print(f"  ERROR: {e}")
            errors.append((table, str(e)))

    # Re-enable FK checks
    pgcur.execute("SET session_replication_role = 'origin';")
    pg_conn.commit()

    print(f"\n{'=' * 60}")
    print(f" DONE - {total} total rows migrated across {len(TABLES)} tables")
    if errors:
        print(f"\n {len(errors)} ERRORS:")
        for t, e in errors:
            print(f"   {t}: {e}")
    else:
        print(" No errors!")
    print("=" * 60)

    mycur.close()
    my_conn.close()
    pgcur.close()
    pg_conn.close()


if __name__ == '__main__':
    main()
