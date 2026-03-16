"""
Step 2: Copy missing users from master, then copy inspections and system_logs.
"""
import psycopg2
import psycopg2.extras
import json

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

# 1. Copy missing users (ids: 1, 5, 8, 9, 10, 31)
missing_ids = [1, 5, 8, 9, 10, 31]
print("=== Copying missing users ===")

# Get columns common to both
mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_user' ORDER BY ordinal_position")
master_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'auth_user' ORDER BY ordinal_position")
dev_cols = set(r[0] for r in dc.fetchall())
common_cols = [c for c in master_cols if c in dev_cols]
col_list = ', '.join(f'"{c}"' for c in common_cols)
placeholders = ', '.join(['%s'] * len(common_cols))

for uid in missing_ids:
    mc.execute(f"SELECT {col_list} FROM auth_user WHERE id = %s", (uid,))
    row = mc.fetchone()
    if row:
        try:
            dc.execute(f"INSERT INTO auth_user ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", row)
            dev_conn.commit()
            print(f"  Copied user id={uid}")
        except Exception as e:
            dev_conn.rollback()
            print(f"  ERROR user id={uid}: {e}")

# 2. Copy inspections (with JSON-safe handling)
print("\n=== Copying food_safety_agency_inspections ===")
mc.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
master_insp_cols_info = mc.fetchall()
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'food_safety_agency_inspections' ORDER BY ordinal_position")
dev_insp_cols = set(r[0] for r in dc.fetchall())
common_insp_cols = [c[0] for c in master_insp_cols_info if c[0] in dev_insp_cols]
col_list = ', '.join(f'"{c}"' for c in common_insp_cols)
placeholders = ', '.join(['%s'] * len(common_insp_cols))

mc.execute(f"SELECT {col_list} FROM food_safety_agency_inspections")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows from master")

batch_size = 100
inserted = 0
for i in range(0, len(rows), batch_size):
    batch = rows[i:i + batch_size]
    for row in batch:
        try:
            # Convert any dict values to Json for psycopg2
            converted = []
            for val in row:
                if isinstance(val, dict) or isinstance(val, list):
                    converted.append(psycopg2.extras.Json(val))
                else:
                    converted.append(val)
            dc.execute(f"INSERT INTO food_safety_agency_inspections ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
            inserted += 1
        except Exception as e:
            dev_conn.rollback()
            print(f"  ERROR row: {e}")
            break
    dev_conn.commit()

print(f"  Inserted {inserted} inspections")

# Reset sequence
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('food_safety_agency_inspections', 'id'), COALESCE((SELECT MAX(id) FROM food_safety_agency_inspections), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# 3. Copy system_logs (with JSON handling)
print("\n=== Copying system_logs ===")
mc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
master_log_cols = [r[0] for r in mc.fetchall()]
dc.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'system_logs' ORDER BY ordinal_position")
dev_log_cols = set(r[0] for r in dc.fetchall())
common_log_cols = [c for c in master_log_cols if c in dev_log_cols]
col_list = ', '.join(f'"{c}"' for c in common_log_cols)
placeholders = ', '.join(['%s'] * len(common_log_cols))

mc.execute(f"SELECT {col_list} FROM system_logs")
rows = mc.fetchall()
print(f"  Fetched {len(rows)} rows from master")

inserted = 0
for row in rows:
    try:
        converted = []
        for val in row:
            if isinstance(val, dict) or isinstance(val, list):
                converted.append(psycopg2.extras.Json(val))
            else:
                converted.append(val)
        dc.execute(f"INSERT INTO system_logs ({col_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", converted)
        inserted += 1
    except Exception as e:
        dev_conn.rollback()
        # Skip rows that reference missing users
        continue
    if inserted % 500 == 0:
        dev_conn.commit()

dev_conn.commit()
print(f"  Inserted {inserted} system_logs")

# Reset sequence
try:
    dc.execute("SELECT setval(pg_get_serial_sequence('system_logs', 'id'), COALESCE((SELECT MAX(id) FROM system_logs), 1))")
    dev_conn.commit()
except:
    dev_conn.rollback()

# Final verification
print("\n=== Dev DB Final Counts ===")
for t in ['auth_user', 'food_safety_agency_clients', 'food_safety_agency_client_emails', 'inspection_groups', 'food_safety_agency_inspections', 'inspections', 'system_logs']:
    dc.execute(f"SELECT COUNT(*) FROM {t}")
    print(f"  {t}: {dc.fetchone()[0]}")

mc.close(); dc.close()
master_conn.close(); dev_conn.close()
print("\nDone!")
