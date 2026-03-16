"""Copy targets, allocations, and fees from master to dev."""
import psycopg2
import psycopg2.extras
import sys

MASTER = dict(dbname='v4_inspection', user='inspection_user', password='InspectionTest2026',
              host='167.88.43.168', port='5432', options='-c default_transaction_read_only=on')
DEV = dict(dbname='inspection_system', user='inspection_user', password='InspectionTest2026',
           host='82.25.97.159', port='5432')

master_conn = psycopg2.connect(**MASTER)
dev_conn = psycopg2.connect(**DEV)
mc = master_conn.cursor()
dc = dev_conn.cursor()

# Get dev user IDs for FK remapping
dc.execute("SELECT id FROM auth_user")
dev_user_ids = set(r[0] for r in dc.fetchall())

# Tables to copy (in FK dependency order)
TABLES = [
    'inspector_mappings',
    'inspector_targets',
    'inspector_manager_allocations',
    'default_fees',
]

for table in TABLES:
    print(f"\n=== {table} ===")

    # Check if table exists on master
    mc.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (table,))
    if not mc.fetchone()[0]:
        print(f"  Not found on master, skipping")
        continue

    # Check if table exists on dev
    dc.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (table,))
    if not dc.fetchone()[0]:
        print(f"  Not found on dev, skipping")
        continue

    # Get common columns
    mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
    master_cols = [r[0] for r in mc.fetchall()]
    dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
    dev_cols = set(r[0] for r in dc.fetchall())
    common = [c for c in master_cols if c in dev_cols]

    if not common:
        print(f"  No common columns, skipping")
        continue

    col_list = ', '.join(f'"{c}"' for c in common)
    col_indices = {c: i for i, c in enumerate(common)}

    # Read from master
    mc.execute(f"SELECT {col_list} FROM {table}")
    rows = mc.fetchall()
    print(f"  Master has {len(rows)} rows")

    if not rows:
        continue

    # Clear dev table first
    dc.execute(f"DELETE FROM {table}")
    dev_conn.commit()
    print(f"  Cleared dev table")

    # Fix user FKs - remap id=1 to id=52 (admin), NULL others missing
    # inspector_id in inspector_mappings is NOT a user FK (uses custom IDs like 9001)
    user_fk_candidates = ['user_id', 'manager_id', 'allocated_by_id']
    cleaned = []
    for row in rows:
        row_list = list(row)
        for fk_col in user_fk_candidates:
            if fk_col in col_indices:
                idx = col_indices[fk_col]
                if row_list[idx] is not None and row_list[idx] not in dev_user_ids:
                    if row_list[idx] == 1:
                        row_list[idx] = 52  # admin on dev
                    else:
                        row_list[idx] = None
        for j, v in enumerate(row_list):
            if isinstance(v, (dict, list)):
                row_list[j] = psycopg2.extras.Json(v)
        cleaned.append(tuple(row_list))

    # Bulk insert
    template = f"({', '.join(['%s'] * len(common))})"
    psycopg2.extras.execute_values(
        dc,
        f"INSERT INTO {table} ({col_list}) VALUES %s ON CONFLICT DO NOTHING",
        cleaned,
        template=template,
        page_size=500
    )
    dev_conn.commit()

    dc.execute(f"SELECT COUNT(*) FROM {table}")
    print(f"  Dev now has {dc.fetchone()[0]} rows")

    # Reset sequence
    try:
        dc.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))")
        dev_conn.commit()
    except:
        dev_conn.rollback()

print("\n=== Final Counts ===")
for t in TABLES:
    try:
        dc.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t}: {dc.fetchone()[0]}")
    except:
        dev_conn.rollback()
        print(f"  {t}: not found")

mc.close(); dc.close()
master_conn.close(); dev_conn.close()
print("\nDone!")
