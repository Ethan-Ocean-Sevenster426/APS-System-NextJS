"""
Copy data from production DB to test DB (read-only from prod).
Connects to both databases directly and copies all rows.
"""
import MySQLdb

# Production DB (read only)
PROD = {
    'host': '167.88.43.168',
    'user': 'v4_user',
    'passwd': 'V4_Secure@2024!',
    'db': 'v4_worksheet',
    'charset': 'utf8mb4',
}

# Test DB (write)
TEST = {
    'host': '82.25.97.159',
    'user': 'inspection_user',
    'passwd': 'InspectionTest2026',
    'db': 'inspection_system',
    'charset': 'utf8mb4',
}

def copy_table(prod_cur, test_conn, test_cur, table):
    """Copy all rows from a table in prod to test."""
    try:
        prod_cur.execute(f"SELECT COUNT(*) FROM `{table}`")
        count = prod_cur.fetchone()[0]
        if count == 0:
            print(f"  {table}: empty, skipping")
            return

        # Get column names
        prod_cur.execute(f"SHOW COLUMNS FROM `{table}`")
        columns = [row[0] for row in prod_cur.fetchall()]
        cols_str = ', '.join(f'`{c}`' for c in columns)
        placeholders = ', '.join(['%s'] * len(columns))

        # Clear test table first
        test_cur.execute(f"DELETE FROM `{table}`")

        # Read from prod in batches
        batch_size = 500
        prod_cur.execute(f"SELECT {cols_str} FROM `{table}`")
        rows = prod_cur.fetchall()

        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            test_cur.executemany(
                f"INSERT INTO `{table}` ({cols_str}) VALUES ({placeholders})",
                batch
            )

        test_conn.commit()
        print(f"  {table}: {count} rows copied")

    except Exception as e:
        test_conn.rollback()
        print(f"  {table}: ERROR - {e}")


def main():
    print("Connecting to production DB (read-only)...")
    prod_conn = MySQLdb.connect(**PROD)
    prod_cur = prod_conn.cursor()

    print("Connecting to test DB...")
    test_conn = MySQLdb.connect(**TEST)
    test_cur = test_conn.cursor()

    # Disable FK checks during import
    test_cur.execute("SET FOREIGN_KEY_CHECKS = 0")

    # Get all tables from test DB (these are the ones we need to fill)
    test_cur.execute("SHOW TABLES")
    test_tables = [row[0] for row in test_cur.fetchall()]

    # Get all tables from prod DB
    prod_cur.execute("SHOW TABLES")
    prod_tables = [row[0] for row in prod_cur.fetchall()]

    # Only copy tables that exist in both
    tables_to_copy = [t for t in test_tables if t in prod_tables]

    # Skip django_migrations - test DB has its own migration state
    tables_to_copy = [t for t in tables_to_copy if t != 'django_migrations']

    print(f"\nCopying {len(tables_to_copy)} tables...\n")

    for table in tables_to_copy:
        copy_table(prod_cur, test_conn, test_cur, table)

    # Re-enable FK checks
    test_cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    test_conn.commit()

    prod_cur.close()
    prod_conn.close()
    test_cur.close()
    test_conn.close()

    print("\nDone! All data copied.")


if __name__ == '__main__':
    main()
