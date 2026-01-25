from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_add_other_upload_fields'),
    ]

    operations = [
        # Add custom fields to Django's auth_user table
        migrations.RunSQL(
            sql=[
                "ALTER TABLE auth_user ADD COLUMN role VARCHAR(20) DEFAULT 'inspector'",
                "ALTER TABLE auth_user ADD COLUMN phone_number VARCHAR(20) NULL",
                "ALTER TABLE auth_user ADD COLUMN department VARCHAR(100) NULL",
                "ALTER TABLE auth_user ADD COLUMN employee_id VARCHAR(50) NULL UNIQUE",
            ],
            reverse_sql=[
                "ALTER TABLE auth_user DROP COLUMN role",
                "ALTER TABLE auth_user DROP COLUMN phone_number",
                "ALTER TABLE auth_user DROP COLUMN department",
                "ALTER TABLE auth_user DROP COLUMN employee_id",
            ]
        ),
    ]
