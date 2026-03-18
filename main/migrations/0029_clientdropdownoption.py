# Generated migration for ClientDropdownOption model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0028_inspectionedithistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientDropdownOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_type', models.CharField(choices=[('facility_type', 'Facility Type'), ('corporate_group', 'Corporate Group'), ('group_type', 'Group Type')], max_length=50)),
                ('value', models.CharField(max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['field_type', 'value'],
                'unique_together': {('field_type', 'value')},
            },
        ),
    ]
