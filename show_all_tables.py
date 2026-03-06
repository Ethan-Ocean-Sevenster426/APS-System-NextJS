import pymssql

conn = pymssql.connect(
    server='102.67.140.12',
    port=1053,
    user='FSAUser2',
    password='password',
    database='AFS',
    timeout=15
)

cursor = conn.cursor()

# Get all tables
cursor.execute("""
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    ORDER BY TABLE_SCHEMA, TABLE_NAME
""")

rows = cursor.fetchall()

print(f"\n{'='*70}")
print(f"  DATABASE: AFS  |  SERVER: 102.67.140.12:1053")
print(f"  Total tables: {len(rows)}")
print(f"{'='*70}\n")

print(f"{'#':<5} {'Schema':<15} {'Table Name':<45} {'Type'}")
print(f"{'-'*5} {'-'*15} {'-'*45} {'-'*15}")

for i, (schema, name, ttype) in enumerate(rows, 1):
    print(f"{i:<5} {schema:<15} {name:<45} {ttype}")

conn.close()
print(f"\nDone.")
