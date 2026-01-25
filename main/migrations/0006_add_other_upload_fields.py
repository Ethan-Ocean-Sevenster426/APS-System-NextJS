# Generated migration for other document upload tracking fields
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('main', '0005_occurrence_report_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='other_uploaded_by',
            field=models.ForeignKey(blank=True, help_text='User who uploaded Other document', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='other_uploads', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='other_uploaded_date',
            field=models.DateTimeField(blank=True, help_text='Date when Other document was uploaded', null=True),
        ),
    ]
