from django.db import migrations, models


def add_user_columns(apps, schema_editor):
    """Add custom columns to auth_user if they don't already exist."""
    cursor = schema_editor.connection.cursor()
    db_engine = schema_editor.connection.vendor  # 'mysql', 'postgresql', 'sqlite'

    # Get existing columns in a database-agnostic way
    if db_engine == 'mysql':
        cursor.execute("SHOW COLUMNS FROM auth_user")
        existing = {row[0] for row in cursor.fetchall()}
    else:
        # PostgreSQL / SQLite
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'auth_user'"
        )
        existing = {row[0] for row in cursor.fetchall()}

    if 'role' not in existing:
        cursor.execute("ALTER TABLE auth_user ADD COLUMN role VARCHAR(20) DEFAULT 'inspector'")
    if 'phone_number' not in existing:
        cursor.execute("ALTER TABLE auth_user ADD COLUMN phone_number VARCHAR(20) NULL")
    if 'department' not in existing:
        cursor.execute("ALTER TABLE auth_user ADD COLUMN department VARCHAR(100) NULL")
    if 'employee_id' not in existing:
        cursor.execute("ALTER TABLE auth_user ADD COLUMN employee_id VARCHAR(50) NULL UNIQUE")


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_add_other_upload_fields'),
    ]

    operations = [
        migrations.RunPython(add_user_columns, migrations.RunPython.noop),
    ]
