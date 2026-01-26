# Generated migration for InspectionGroup model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0011_add_inspection_sequence'),
    ]

    operations = [
        # Create InspectionGroup model (PARENT)
        migrations.CreateModel(
            name='InspectionGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('client_name', models.CharField(max_length=255)),
                ('date_of_inspection', models.DateField()),
                ('inspector_name', models.CharField(blank=True, max_length=100, null=True)),
                ('town', models.CharField(blank=True, max_length=100, null=True)),
                ('facility_type', models.CharField(blank=True, max_length=100, null=True)),
                ('group_type', models.CharField(blank=True, max_length=100, null=True)),
                ('corporate_group', models.CharField(blank=True, max_length=100, null=True)),
                ('additional_email', models.EmailField(blank=True, max_length=254, null=True)),
                ('comment', models.TextField(blank=True, null=True)),
                ('km_traveled', models.FloatField(blank=True, null=True)),
                ('hours', models.FloatField(blank=True, null=True)),
                ('is_manual', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='main.client')),
            ],
            options={
                'db_table': 'inspection_groups',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['client_name', 'date_of_inspection'], name='idx_group_client_date'),
                    models.Index(fields=['created_at'], name='idx_group_created'),
                ],
            },
        ),

        # Add group foreign key to FoodSafetyAgencyInspection (CHILD)
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='inspection_group',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='inspections',
                to='main.inspectiongroup',
                help_text='Parent group that this inspection belongs to'
            ),
        ),

        # Add index for faster group lookups
        migrations.AddIndex(
            model_name='foodsafetyagencyinspection',
            index=models.Index(fields=['inspection_group'], name='idx_insp_group'),
        ),
    ]
