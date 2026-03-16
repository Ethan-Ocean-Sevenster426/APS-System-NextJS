"""
Copy inspections and system_logs from master to dev.
Uses bulk INSERT with execute_values for speed.
NULLs out FK user references that don't exist on dev.
"""
import psycopg2
import psycopg2.extras
import sys

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
print(f"Dev has {len(dev_user_ids)} users")

# User FK columns in inspections table
user_fk_cols = ['sent_by_id', 'rfi_uploaded_by_id', 'invoice_uploaded_by_id', 'approved_by_id',
                'lab_uploaded_by_id', 'lab_form_uploaded_by_id', 'retest_uploaded_by_id',
                'compliance_uploaded_by_id', 'occurrence_uploaded_by_id', 'composition_uploaded_by_id',
                'other_uploaded_by_id']

def get_common_columns(table):
    mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
    master_cols = [r[0] for r in mc.fetchall()]
    dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position", (table,))
    dev_cols = set(r[0] for r in dc.fetchall())
    return [c for c in master_cols if c in dev_cols]

# === INSPECTIONS ===
print("\n=== Copying food_safety_agency_inspections ===")
common = get_common_columns('food_safety_agency_inspections')
col_list = ', '.join(f'"{c}"' for c in common)
col_indices = {c: i for i, c in enumerate(common)}

mc.execute(f"SELECT {col_list} FROM food_safety_agency_inspections")
rows = mc.fetchall()
total = len(rows)
print(f"  Fetched {total} rows from master")

# Fix user FKs and JSON fields
cleaned = []
for i, row in enumerate(rows):
    row_list = list(row)
    for fk_col in user_fk_cols:
        if fk_col in col_indices:
            idx = col_indices[fk_col]
            if row_list[idx] is not None and row_list[idx] not in dev_user_ids:
                row_list[idx] = None
    # Wrap dicts/lists for JSON
    for j, v in enumerate(row_list):
        if isinstance(v, (dict, list)):
            row_list[j] = psycopg2.extras.Json(v)
    cleaned.append(tuple(row_list))
    if (i + 1) % 100 == 0:
        print(f"  Prepared {i + 1}/{total}...")
        sys.stdout.flush()

# Bulk insert
print(f"  Bulk inserting {len(cleaned)} rows...")
sys.stdout.flush()
template = f"({', '.join(['%s'] * len(common))})"
psycopg2.extras.execute_values(
    dc,
    f"INSERT INTO food_safety_agency_inspections ({col_list}) VALUES %s ON CONFLICT DO NOTHING",
    cleaned,
    template=template,
    page_size=500
)
dev_conn.commit()
dc.execute("SELECT COUNT(*) FROM food_safety_agency_inspections")
print(f"  Done! Table now has {dc.fetchone()[0]} rows")

# Reset sequence
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('food_safety_agency_inspections', 'id'), COALESCE((SELECT MAX(id) FROM food_safety_agency_inspections), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# === SYSTEM LOGS ===
print("\n=== Copying system_logs ===")
common = get_common_columns('system_logs')
col_list = ', '.join(f'"{c}"' for c in common)
col_indices = {c: i for i, c in enumerate(common)}

mc.execute(f"SELECT {col_list} FROM system_logs")
rows = mc.fetchall()
total = len(rows)
print(f"  Fetched {total} rows from master")

# Filter out rows with missing users, fix JSON
cleaned = []
skipped = 0
for i, row in enumerate(rows):
    row_list = list(row)
    if 'user_id' in col_indices:
        uid = row_list[col_indices['user_id']]
        if uid not in dev_user_ids:
            skipped += 1
            continue
    for j, v in enumerate(row_list):
        if isinstance(v, (dict, list)):
            row_list[j] = psycopg2.extras.Json(v)
    cleaned.append(tuple(row_list))
    if (i + 1) % 500 == 0:
        print(f"  Prepared {i + 1}/{total}...")
        sys.stdout.flush()

print(f"  Bulk inserting {len(cleaned)} rows (skipped {skipped} with missing users)...")
sys.stdout.flush()
template = f"({', '.join(['%s'] * len(common))})"
psycopg2.extras.execute_values(
    dc,
    f"INSERT INTO system_logs ({col_list}) VALUES %s ON CONFLICT DO NOTHING",
    cleaned,
    template=template,
    page_size=500
)
dev_conn.commit()
dc.execute("SELECT COUNT(*) FROM system_logs")
print(f"  Done! Table now has {dc.fetchone()[0]} rows")

try:
    dc.execute("SELECT setval(pg_get_serial_sequence('system_logs', 'id'), COALESCE((SELECT MAX(id) FROM system_logs), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# === FINAL COUNTS ===
print("\n=== Dev DB Final Counts ===")
for t in ['auth_user', 'food_safety_agency_clients', 'inspection_groups', 'food_safety_agency_inspections', 'system_logs']:
    dc.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {dc.fetchone()[0]}")

mc.close(); dc.close()
master_conn.close(); dev_conn.close()
print("\nDone!")
