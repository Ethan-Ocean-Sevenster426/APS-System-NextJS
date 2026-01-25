# Generated migration for client classification fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0008_add_product_compliant_field'),
    ]

    operations = [
        # Add classification fields to Client model
        migrations.AddField(
            model_name='client',
            name='town',
            field=models.CharField(max_length=100, blank=True, null=True, verbose_name='Town/Location'),
        ),
        migrations.AddField(
            model_name='client',
            name='corporate_group',
            field=models.CharField(max_length=200, blank=True, null=True, verbose_name='Corporate Group', help_text='e.g., Pick n Pay - Franchise'),
        ),
        migrations.AddField(
            model_name='client',
            name='group_type',
            field=models.CharField(max_length=100, blank=True, null=True, verbose_name='Group Type', help_text='e.g., Corporate Store, Franchise Store'),
        ),
        migrations.AddField(
            model_name='client',
            name='facility_type',
            field=models.CharField(max_length=100, blank=True, null=True, verbose_name='Facility Type', help_text='e.g., Retailer, Butchery, Re-Packer'),
        ),
    ]
