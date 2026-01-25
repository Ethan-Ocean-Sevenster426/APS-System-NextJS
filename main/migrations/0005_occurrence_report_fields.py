# Generated migration for occurrence report fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0004_add_classification_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='is_occurrence_report',
            field=models.BooleanField(default=False, help_text='True if this is an occurrence report (not a regular inspection)'),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='registration_code',
            field=models.CharField(blank=True, help_text='Registration code (can include dashes, e.g., ABC-123-456)', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='physical_address',
            field=models.TextField(blank=True, help_text='Physical address of the facility', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='telephone',
            field=models.CharField(blank=True, help_text='Telephone number', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='time_of_visit',
            field=models.TimeField(blank=True, help_text='Time of visit for occurrence report', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_findings',
            field=models.JSONField(blank=True, help_text='List of findings from occurrence report', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_description',
            field=models.TextField(blank=True, help_text='Description of events for occurrence report', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_inspector_name',
            field=models.CharField(blank=True, help_text='Auditor/Inspector name for occurrence report', max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_inspector_date',
            field=models.DateField(blank=True, help_text='Inspector signature date', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_inspector_signature',
            field=models.TextField(blank=True, help_text='Inspector signature (base64 encoded image)', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_manager_name',
            field=models.CharField(blank=True, help_text='Manager/Owner name for occurrence report', max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_manager_date',
            field=models.DateField(blank=True, help_text='Manager signature date', null=True),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='occurrence_manager_signature',
            field=models.TextField(blank=True, help_text='Manager signature (base64 encoded image)', null=True),
        ),
    ]
