from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0024_merge_20260313_1316'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Drop old table and recreate with new schema (no existing data to preserve)
        migrations.RunSQL(
            sql="DELETE FROM inspector_manager_allocations;",
            reverse_sql="",
        ),
        migrations.AlterUniqueTogether(
            name='inspectormanagerallocation',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='inspectormanagerallocation',
            name='inspector_mapping',
        ),
        migrations.AddField(
            model_name='inspectormanagerallocation',
            name='inspector',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inspector_managers',
                to=settings.AUTH_USER_MODEL,
                default=1,
            ),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name='inspectormanagerallocation',
            unique_together={('manager', 'inspector')},
        ),
    ]
