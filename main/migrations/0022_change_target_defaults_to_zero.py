from django.db import migrations, models


def reset_old_default_targets(apps, schema_editor):
    """Reset InspectorTarget records that still have the old hardcoded defaults to 0."""
    InspectorTarget = apps.get_model('main', 'InspectorTarget')
    InspectorTarget.objects.filter(
        eggs=51, poultry=59, raw=63, pmp=54,
        raw_samples=58, pmp_samples=12, total_samples=70
    ).update(eggs=0, poultry=0, raw=0, pmp=0, raw_samples=0, pmp_samples=0, total_samples=0)


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0021_quarterlytarget'),
    ]

    operations = [
        migrations.RunPython(reset_old_default_targets, migrations.RunPython.noop),
        # InspectorTarget: change defaults to 0
        migrations.AlterField(
            model_name='inspectortarget',
            name='eggs',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='poultry',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='raw',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='pmp',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='raw_samples',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='pmp_samples',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='inspectortarget',
            name='total_samples',
            field=models.IntegerField(default=0),
        ),
        # QuarterlyTarget: change defaults to 0
        migrations.AlterField(
            model_name='quarterlytarget',
            name='eggs',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='poultry',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='raw',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='pmp',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='raw_samples',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='pmp_samples',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='quarterlytarget',
            name='total_samples',
            field=models.IntegerField(default=0),
        ),
    ]
