# Generated migration for product compliance tracking
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_add_user_custom_fields'),
    ]

    operations = [
        # Add product compliance field
        migrations.AddField(
            model_name='foodsafetyagencyinspection',
            name='is_product_compliant',
            field=models.BooleanField(default=True, help_text="Product compliance status (based on composition/RFI document)"),
        ),
    ]
