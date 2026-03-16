"""
Copy inspections and system_logs with FK constraints temporarily disabled.
Then remap user id=1 references to id=52 (admin on dev).
"""
import psycopg2
import psycopg2.extras

DEV = {
    'dbname': 'inspection_system',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '82.25.97.159',
    'port': '5432',
}

MASTER = {
    'dbname': 'v4_inspection',
    'user': 'inspection_user',
    'password': 'InspectionTest2026',
    'host': '167.88.43.168',
    'port': '5432',
    'options': '-c default_transaction_read_only=on'
}

master_conn = psycopg2.connect(**MASTER)
dev_conn = psycopg2.connect(**DEV)
dev_conn.autocommit = True
mc = master_conn.cursor()
dc = dev_conn.cursor()

# Step 1: Disable FK triggers on the inspections table
print("Disabling FK constraints on food_safety_agency_inspections...")
dc.execute("ALTER TABLE food_safety_agency_inspections DISABLE TRIGGER ALL")

# Step 2: Copy inspections
print("Copying food_safety_agency_inspections...")
mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
master_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
dev_cols = set(r[0] for r in dc.fetchall())
common = [c for c in master_cols if c in dev_cols]
col_list = ', '.join(f'"{c}"' for c in common)
placeholders = ', '.join(['%s'] * len(common))

mc.execute(f"SELECT {col_list} FROM food_safety_agency_inspections")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows")

inserted = 0
for row in rows:
    converted = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in row]
    try:
        dc.execute(f"INSERT INTO food_safety_agency_inspections ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
        inserted += 1
    except Exception as e:
        print(f"  ERROR: {e}")
print(f"  Inserted {inserted} inspections")

# Step 3: Remap user id=1 -> id=52 (admin on dev)
print("Remapping user id=1 -> id=52 on inspections...")
user_fk_cols = ['sent_by_id', 'rfi_uploaded_by_id', 'invoice_uploaded_by_id', 'approved_by_id',
                'lab_uploaded_by_id', 'lab_form_uploaded_by_id', 'retest_uploaded_by_id',
                'compliance_uploaded_by_id', 'occurrence_uploaded_by_id', 'composition_uploaded_by_id',
                'other_uploaded_by_id']
for col in user_fk_cols:
    try:
        dc.execute(f"UPDATE food_safety_agency_inspections SET \"{col}\" = 52 WHERE \"{col}\" = 1")
        if dc.rowcount > 0:
            print(f"  {col}: {dc.rowcount} rows updated")
    except Exception as e:
        print(f"  {col}: skip ({e})")

# Step 4: Re-enable FK triggers
print("Re-enabling FK constraints...")
dc.execute("ALTER TABLE food_safety_agency_inspections ENABLE TRIGGER ALL")

# Step 5: Reset sequence
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('food_safety_agency_inspections', 'id'), COALESCE((SELECT MAX(id) FROM food_safety_agency_inspections), 1))")
except:
    pass

# Step 6: Copy system_logs (disable triggers too)
print("\nCopying system_logs...")
dc.execute("ALTER TABLE system_logs DISABLE TRIGGER ALL")

mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
master_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
dev_cols = set(r[0] for r in dc.fetchall())
common = [c for c in master_cols if c in dev_cols]
col_list = ', '.join(f'"{c}"' for c in common)
placeholders = ', '.join(['%s'] * len(common))

mc.execute(f"SELECT {col_list} FROM system_logs")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows")

inserted = 0
for row in rows:
    converted = [psycopg2.extras.Json(v) if isinstance(v, (dict, list)) else v for v in row]
    try:
        dc.execute(f"INSERT INTO system_logs ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
        inserted += 1
    except Exception as e:
        pass
print(f"  Inserted {inserted} system_logs")

# Remap user id=1 -> 52 in system_logs too
dc.execute("UPDATE system_logs SET user_id = 52 WHERE user_id = 1")
print(f"  Remapped {dc.rowcount} system_logs user_id 1->52")

dc.execute("ALTER TABLE system_logs ENABLE TRIGGER ALL")
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('system_logs', 'id'), COALESCE((SELECT MAX(id) FROM system_logs), 1))")
except:
    pass

# Final counts
print("\n=== Dev DB Final Counts ===")
for t in ['auth_user', 'food_safety_agency_clients', 'inspection_groups', 'food_safety_agency_inspections', 'system_logs']:
    dc.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {dc.fetchone()[0]}")

mc.close(); dc.close()
master_conn.close(); dev_conn.close()
print("\nDone!")
