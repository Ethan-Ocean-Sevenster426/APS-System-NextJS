"""
Copy all data from Master DB (167.88.43.168) to Dev DB (82.25.97.159).
Master connection is READ-ONLY. Dev connection has write access.
"""
import psycopg2
import psycopg2.extras

# Master DB (READ-ONLY)
MASTER = {
    'dbname': 'v4_inspection',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '167.88.43.168',
    'port': '5432',
    'options': '-c default_transaction_read_only=on'
}

# Dev DB (WRITE)
DEV = {
    'dbname': 'inspection_system',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '82.25.97.159',
    'port': '5432',
}

# Tables in order (respecting FK dependencies)
TABLES = [
    'food_safety_agency_clients',
    'food_safety_agency_client_emails',
    'inspection_groups',
    'food_safety_agency_inspections',
    'inspections',
    'system_logs',
]

def copy_table(master_cur, dev_cur, table_name):
    """Copy all rows from master to dev for a given table."""
    # Get column names from master
    master_cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table_name,))
    columns = [row[0] for row in master_cur.fetchall()]
    
    if not columns:
        print(f"  SKIP {table_name}: no columns found on master")
        return 0

    # Check which columns exist on dev
    dev_cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table_name,))
    dev_columns = set(row[0] for row in dev_cur.fetchall())
    
    # Only use columns that exist in BOTH databases
    common_columns = [c for c in columns if c in dev_columns]
    if not common_columns:
        print(f"  SKIP {table_name}: no common columns")
        return 0

    col_list = ', '.join(f'"{c}"' for c in common_columns)
    placeholders = ', '.join(['%s'] * len(common_columns))

    # Read from master
    master_cur.execute(f"SELECT {col_list} FROM {table_name}")
    rows = master_cur.fetchall()
    
    if not rows:
        print(f"  {table_name}: 0 rows (empty on master)")
        return 0

    # Insert into dev in batches
    batch_size = 500
    inserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        args_str = ','.join(
            dev_cur.mogrify(f"({placeholders})", row).decode('utf-8')
            for row in batch
        )
        dev_cur.execute(f"INSERT INTO {table_name} ({col_list}) VALUES {args_str} ON CONFLICT DO NOTHING")
        inserted += len(batch)

    print(f"  {table_name}: {inserted} rows copied")
    return inserted


def reset_sequences(dev_cur, table_name):
    """Reset auto-increment sequences after data copy."""
    try:
        dev_cur.execute(f"""
            SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), 
                   COALESCE((SELECT MAX(id) FROM {table_name}), 1))
        """)
    except Exception:
        pass  # Table might not have a serial id column


def main():
    print("Connecting to Master DB (READ-ONLY)...")
    master_conn = psycopg2.connect(**MASTER)
    master_cur = master_conn.cursor()

    print("Connecting to Dev DB...")
    dev_conn = psycopg2.connect(**DEV)
    dev_cur = dev_conn.cursor()

    print("\n=== Copying data from Master -> Dev ===\n")

    total = 0
    for table in TABLES:
        try:
            count = copy_table(master_cur, dev_cur, table)
            total += count
            reset_sequences(dev_cur, table)
            dev_conn.commit()
        except Exception as e:
            dev_conn.rollback()
            print(f"  ERROR on {table}: {e}")

    print(f"\n=== Done! Total rows copied: {total} ===")

    # Verify counts
    print("\n=== Verification ===")
    for table in TABLES:
        try:
            dev_cur.execute(f"SELECT COUNT(*) FROM {table}")
            print(f"  {table}: {dev_cur.fetchone()[0]}")
        except Exception as e:
            print(f"  {table}: ERROR {e}")
            dev_conn.rollback()

    master_cur.close()
    master_conn.close()
    dev_cur.close()
    dev_conn.close()

if __name__ == '__main__':
    main()
