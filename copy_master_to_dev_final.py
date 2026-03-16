"""
Copy inspections and system_logs from master to dev.
NULL out any FK user references that don't exist on dev.
"""
import psycopg2
import psycopg2.extras

MASTER = {
    'dbname': 'v4_inspection',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '167.88.43.168',
    'port': '5432',
    'options': '-c default_transaction_read_only=on'
}
DEV = {
    'dbname': 'inspection_system',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '82.25.97.159',
    'port': '5432',
}

master_conn = psycopg2.connect(**MASTER)
dev_conn = psycopg2.connect(**DEV)
mc = master_conn.cursor()
dc = dev_conn.cursor()

# Get dev user IDs
dc.execute("SELECT id FROM auth_user")
dev_user_ids = set(r[0] for r in dc.fetchall())
print(f"Dev has {len(dev_user_ids)} users: {sorted(dev_user_ids)}")

# User FK columns in inspections table
user_fk_cols = ['sent_by_id', 'rfi_uploaded_by_id', 'invoice_uploaded_by_id', 'approved_by_id',
                'lab_uploaded_by_id', 'lab_form_uploaded_by_id', 'retest_uploaded_by_id',
                'compliance_uploaded_by_id', 'occurrence_uploaded_by_id', 'composition_uploaded_by_id',
                'other_uploaded_by_id']

# === INSPECTIONS ===
print("\n=== Copying food_safety_agency_inspections ===")
mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
master_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
dev_cols_set = set(r[0] for r in dc.fetchall())
common = [c for c in master_cols if c in dev_cols_set]

col_list = ', '.join(f'"{c}"' for c in common)
col_indices = {c: i for i, c in enumerate(common)}

mc.execute(f"SELECT {col_list} FROM food_safety_agency_inspections")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows from master")

placeholders = ', '.join(['%s'] * len(common))
inserted = 0
errors = 0

for row in rows:
    row_list = list(row)
    # Replace user FK ids that don't exist on dev with NULL
    for fk_col in user_fk_cols:
        if fk_col in col_indices:
            idx = col_indices[fk_col]
            if row_list[idx] is not None and row_list[idx] not in dev_user_ids:
                row_list[idx] = None
    # Handle JSON fields
    converted = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in row_list]
    try:
        dc.execute(f"INSERT INTO food_safety_agency_inspections ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
        inserted += 1
    except Exception as e:
        dev_conn.rollback()
        errors += 1
        if errors <= 5:
            print(f"  ERROR: {e}")

dev_conn.commit()
print(f"  Inserted: {inserted}, Errors: {errors}")

# Reset sequence
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('food_safety_agency_inspections', 'id'), COALESCE((SELECT MAX(id) FROM food_safety_agency_inspections), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# === SYSTEM LOGS ===
print("\n=== Copying system_logs ===")
mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
master_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
dev_cols_set = set(r[0] for r in dc.fetchall())
common = [c for c in master_cols if c in dev_cols_set]

col_list = ', '.join(f'"{c}"' for c in common)
col_indices = {c: i for i, c in enumerate(common)}

mc.execute(f"SELECT {col_list} FROM system_logs")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows from master")

placeholders = ', '.join(['%s'] * len(common))
inserted = 0
skipped = 0

for row in rows:
    row_list = list(row)
    # user_id is NOT NULL, so skip rows where user doesn't exist on dev
    if 'user_id' in col_indices:
        uid = row_list[col_indices['user_id']]
        if uid not in dev_user_ids:
            skipped += 1
            continue
    converted = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in row_list]
    try:
        dc.execute(f"INSERT INTO system_logs ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
        inserted += 1
    except Exception as e:
        dev_conn.rollback()
        if inserted == 0:
            print(f"  ERROR: {e}")

dev_conn.commit()
print(f"  Inserted: {inserted}, Skipped (missing user): {skipped}")

try:
    dc.execute("SELECT setval(pg_get_serial_sequence('system_logs', 'id'), COALESCE((SELECT MAX(id) FROM system_logs), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# === FINAL VERIFICATION ===
print("\n=== Dev DB Final Counts ===")
for t in ['auth_user', 'food_safety_agency_clients', 'inspection_groups', 'food_safety_agency_inspections', 'system_logs']:
    dc.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {dc.fetchone()[0]}")

mc.close(); dc.close()
master_conn.close(); dev_conn.close()
print("\nDone!")
