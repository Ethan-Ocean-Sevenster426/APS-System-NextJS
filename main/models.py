from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import User
from django.core.cache import cache
from django.conf import settings
from datetime import date
import re
from django.utils import timezone

# Add role field to existing User model
User.add_to_class('role', models.CharField(
    max_length=20,
    choices=[
        ('inspector', 'Inspector'),
        ('admin', 'HR/Admin Staff'),
        ('super_admin', 'Super Admin'),
        ('financial_admin', 'Financial Admin'),
        ('lab_technician', 'Lab Technician'),
        ('scientist', 'Scientist'),
        ('developer', 'Developer'),
    ],
    default='inspector',
    help_text="User role in the system"
))

User.add_to_class('phone_number', models.CharField(max_length=20, blank=True, null=True))
User.add_to_class('department', models.CharField(max_length=100, blank=True, null=True))
User.add_to_class('employee_id', models.CharField(max_length=50, blank=True, null=True, unique=True))

# Add properties to User model
@property
def is_inspector(self):
    return getattr(self, 'role', 'inspector') == 'inspector'

@property
def is_admin(self):
    return getattr(self, 'role', 'inspector') == 'admin'

@property
def is_super_admin(self):
    return getattr(self, 'role', 'inspector') == 'super_admin'

@property
def is_financial_admin(self):
    return getattr(self, 'role', 'inspector') == 'financial_admin'

@property
def is_lab_technician(self):
    return getattr(self, 'role', 'inspector') == 'lab_technician'

@property
def is_scientist(self):
    return getattr(self, 'role', 'inspector') == 'scientist'

def has_role_permission(self, required_role):
    """Check if user has the required role or higher"""
    role_hierarchy = {
        'inspector': 1,
        'admin': 2,
        'financial_admin': 3,
        'lab_technician': 3,
        'scientist': 3,
        'super_admin': 4,
        'developer': 5,
    }

    user_level = role_hierarchy.get(getattr(self, 'role', 'inspector'), 0)
    required_level = role_hierarchy.get(required_role, 0)

    return user_level >= required_level

User.add_to_class('is_inspector', is_inspector)
User.add_to_class('is_admin', is_admin)
User.add_to_class('is_super_admin', is_super_admin)
User.add_to_class('is_financial_admin', is_financial_admin)
User.add_to_class('is_lab_technician', is_lab_technician)
User.add_to_class('is_scientist', is_scientist)
User.add_to_class('has_role_permission', has_role_permission)

class ClientManager(models.Manager):
    def get_next_client_id(self):
        """Generate next sequential client ID (CL00001, CL00002, etc.)"""
        last_client = self.order_by('-id').first()
        if last_client:
            last_id = int(last_client.client_id[2:])
            return f"CL{(last_id + 1):05d}"
        else:
            return "CL00001"

class InspectorMapping(models.Model):
    """Model to store inspector ID mappings for the server"""
    inspector_id = models.IntegerField(unique=True, help_text="Server inspector ID (e.g., 1234567)")
    inspector_name = models.CharField(max_length=100, help_text="Human-readable inspector name (e.g., Ethan)")
    is_active = models.BooleanField(default=True, help_text="Whether this inspector is active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inspector_mappings'
        ordering = ['inspector_name']
        verbose_name = "Inspector Mapping"
        verbose_name_plural = "Inspector Mappings"
        indexes = [
            models.Index(fields=['inspector_id']),
            models.Index(fields=['inspector_name']),
        ]
    
    def __str__(self):
        return f"{self.inspector_name} (ID: {self.inspector_id})"


class SystemSettings(models.Model):
    """System settings for automatic synchronization and preferences.

    NOTE: Background sync is ALWAYS ENABLED to prevent missing inspection data.
    The sync enable/disable fields below are kept for compatibility but are ignored.
    """

    # Auto Sync Settings (ALWAYS ENABLED - field kept for compatibility only)
    auto_sync_enabled = models.BooleanField(default=True, verbose_name="Enable Auto Sync",
                                           help_text="Background sync is ALWAYS enabled to prevent data loss")
    backup_frequency_days = models.IntegerField(default=7, verbose_name="Backup Frequency (days)")
    session_timeout_minutes = models.IntegerField(default=30, verbose_name="Session Timeout (minutes)")

    # Data Sync Settings (ALWAYS runs automatically in background)
    google_sheets_enabled = models.BooleanField(default=True, verbose_name="Google Sheets Integration",
                                               help_text="Always syncs - field kept for compatibility")
    sql_server_enabled = models.BooleanField(default=True, verbose_name="SQL Server Integration",
                                            help_text="Always syncs - field kept for compatibility")
    sync_interval_hours = models.FloatField(default=1.0, verbose_name="Sync Interval (hours)")
    
    # Compliance Documents Settings
    compliance_sync_enabled = models.BooleanField(default=True, verbose_name="Enable Automatic Compliance Sync")
    compliance_sync_interval_hours = models.IntegerField(default=24, verbose_name="Compliance Sync Interval (hours)")
    compliance_processing_mode = models.CharField(
        max_length=20,
        default='incremental',
        choices=[
            ('all_at_once', 'Process ALL at Once'),
            ('incremental', 'Incremental Processing'),
            ('manual', 'Manual Processing Only')
        ],
        verbose_name="Processing Mode"
    )
    
    # Performance Optimization Settings
    compliance_daily_sync_enabled = models.BooleanField(default=True, verbose_name="Enable Daily Compliance Sync")
    compliance_last_processed_date = models.DateTimeField(null=True, blank=True, verbose_name="Last Compliance Process Date")
    compliance_skip_processed = models.BooleanField(default=True, verbose_name="Skip Already Processed Documents")
    
    # Priority Refresh Settings
    priority_1_interval = models.IntegerField(default=1, verbose_name="First 2 Months Refresh Interval")
    priority_1_unit = models.CharField(max_length=10, default='hours', verbose_name="First 2 Months Unit")
    priority_2_interval = models.IntegerField(default=2, verbose_name="Last 2 Months Refresh Interval")
    priority_2_unit = models.CharField(max_length=10, default='hours', verbose_name="Last 2 Months Unit")
    
    # OneDrive Settings
    onedrive_enabled = models.BooleanField(default=True, verbose_name="OneDrive Integration")
    onedrive_local_caching = models.BooleanField(default=True, verbose_name="Enable Local File Caching")
    onedrive_cache_days = models.IntegerField(default=60, verbose_name="Cache Duration (Days)")
    onedrive_auto_sync = models.BooleanField(default=True, verbose_name="Enable Auto Sync")
    onedrive_sync_interval_hours = models.IntegerField(default=2, verbose_name="Sync Interval (Hours)")
    onedrive_upload_delay_days = models.IntegerField(default=3, verbose_name="Upload Delay (Days)")
    onedrive_upload_delay_unit = models.CharField(
        max_length=10,
        default='days',
        choices=[
            ('hours', 'Hours'),
            ('days', 'Days'),
            ('weeks', 'Weeks'),
            ('months', 'Months'),
            ('years', 'Years')
        ],
        verbose_name="Upload Delay Unit"
    )
    
    # Theme Settings
    theme_mode = models.CharField(
        max_length=10,
        default='light',
        choices=[
            ('light', 'Light Mode'),
            ('dark', 'Dark Mode'),
            ('auto', 'Auto')
        ],
        verbose_name="Theme Mode"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"
    
    def __str__(self):
        return f"System Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one system settings record exists
        if not self.pk:
            SystemSettings.objects.all().delete()
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create system settings."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class Client(models.Model):
    """General clients table"""
    client_id = models.CharField(max_length=200, unique=True, db_index=True)
    name = models.CharField(max_length=200, db_index=True, verbose_name="Client Name")
    internal_account_code = models.CharField(max_length=100, blank=True, null=True, verbose_name="Internal Account Code", help_text="From Google Sheets Column H")
    email = models.EmailField(blank=True, null=True, verbose_name="Client Email", help_text="From Google Sheets Column K")
    manual_email = models.EmailField(blank=True, null=True, verbose_name="Manual Email Override", help_text="Manually added email that persists across syncs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = ClientManager()
    
    class Meta:
        db_table = 'food_safety_agency_clients'
        ordering = ['name']
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        indexes = [
            models.Index(fields=['client_id']),
            models.Index(fields=['name']),
            models.Index(fields=['internal_account_code']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.client_id})"
    
    def save(self, *args, **kwargs):
        if not self.client_id:
            self.client_id = Client.objects.get_next_client_id()
        super().save(*args, **kwargs)


class ClientEmail(models.Model):
    """Additional emails linked to a client (persists across syncs)."""
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='additional_emails')
    email = models.EmailField()
    label = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'food_safety_agency_client_emails'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['client']),
        ]

    def __str__(self):
        return f"{self.email} -> {self.client.client_id}"

class Inspection(models.Model):
    """Inspection data model based on the provided structure"""
    
    # Inspector information
    inspector = models.CharField(max_length=100, help_text="Inspector name (e.g., Cinga Ngongo)")
    inspection_number = models.PositiveIntegerField(help_text="Sequential inspection number")
    
    # Basic inspection details
    inspection_date = models.DateField(help_text="Date of inspection")
    facility_client_name = models.CharField(max_length=200, help_text="Facility or client name")
    town = models.CharField(max_length=100, blank=True, null=True, help_text="Town/location")
    
    # Product information
    commodity = models.CharField(max_length=50, blank=True, null=True, help_text="Commodity type (e.g., RAW)")
    product_name = models.CharField(max_length=100, blank=True, null=True, help_text="Product name (e.g., Mince, Mildwors)")
    product_class = models.CharField(max_length=100, blank=True, null=True, help_text="Product class (e.g., Raw species sausage / wors)")
    
    # Inspection activities
    inspected = models.BooleanField(default=False, help_text="Was inspection conducted?")
    sampled = models.BooleanField(default=False, help_text="Was sampling conducted?")
    
    # Operational details
    normal_hours = models.DecimalField(max_digits=4, decimal_places=1, blank=True, null=True, help_text="Normal hours worked")
    kilometres_traveled = models.DecimalField(max_digits=6, decimal_places=1, blank=True, null=True, help_text="Kilometres traveled")
    
    # Testing parameters
    fat = models.BooleanField(default=False, help_text="Fat testing required")
    protein = models.BooleanField(default=False, help_text="Protein testing required")
    calcium = models.BooleanField(default=False, help_text="Calcium testing required")
    dna = models.BooleanField(default=False, help_text="DNA testing required")
    
    # Sample and lab information
    bought_sample_amount = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Amount paid for sample")
    lab_used = models.CharField(max_length=100, blank=True, null=True, help_text="Laboratory used (e.g., Food Safety Laboratory)")
    
    # Documentation and follow-up
    follow_up = models.BooleanField(default=False, help_text="Follow-up required")
    occurrence_report = models.BooleanField(default=False, help_text="Accurance report required")
    dispensation_application = models.BooleanField(default=False, help_text="Dispensation application required")
    
    # Comments and notes
    comments = models.TextField(blank=True, null=True, help_text="Additional comments or notes")
    
    # File uploads and references
    uploaded = models.BooleanField(default=False, help_text="Files uploaded")
    rfi_reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="RFI reference number")
    invoice_reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Invoice reference number")
    lab_result_reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Lab result reference number")
    
    # Re-testing information
    re_test = models.BooleanField(default=False, help_text="Re-test required")
    re_test_reference_number = models.CharField(max_length=100, blank=True, null=True, help_text="Re-test reference number")
    
    # External testing and compliance
    verification_external_testing = models.BooleanField(default=False, help_text="External testing verification required")
    compliance_document = models.BooleanField(default=False, help_text="Compliance document required")
    direction_expiry_date = models.DateField(blank=True, null=True, help_text="Direction expiry date")
    
    # Contact information
    email = models.EmailField(blank=True, null=True, help_text="Primary email contact")
    additional_email_1 = models.EmailField(blank=True, null=True, help_text="Additional email contact 1")
    additional_email_2 = models.EmailField(blank=True, null=True, help_text="Additional email contact 2")
    additional_email_3 = models.EmailField(blank=True, null=True, help_text="Additional email contact 3")
    additional_email_4 = models.EmailField(blank=True, null=True, help_text="Additional email contact 4")
    
    # Communication tracking
    was_mail_sent = models.BooleanField(default=False, help_text="Was email sent?")
    compiled_supporting_documents = models.BooleanField(default=False, help_text="Supporting documents compiled")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inspections'
        ordering = ['-inspection_date', '-inspection_number']
        verbose_name = "Inspection"
        verbose_name_plural = "Inspections"
    
    def __str__(self):
        return f"{self.inspector} - {self.facility_client_name} - {self.inspection_date}"

class FoodSafetyAgencyInspection(models.Model):
    """Food Safety Agency Inspection data copied from remote SQL Server"""
    
    # Basic inspection details
    commodity = models.CharField(max_length=50, blank=True, null=True, help_text="Commodity type (e.g., POULTRY, RAW, PMP, EGGS)")
    date_of_inspection = models.DateField(blank=True, null=True, help_text="Date of inspection")
    start_of_inspection = models.TimeField(blank=True, null=True, help_text="Start time of inspection")
    end_of_inspection = models.TimeField(blank=True, null=True, help_text="End time of inspection")
    
    # Location and inspection details
    inspection_location_type_id = models.IntegerField(blank=True, null=True, help_text="Inspection location type ID")
    is_direction_present_for_this_inspection = models.BooleanField(default=False, help_text="Direction present for this inspection")
    inspector_id = models.IntegerField(blank=True, null=True, help_text="Inspector ID from remote system")
    inspector_name = models.CharField(max_length=100, blank=True, null=True, help_text="Human-readable inspector name")
    
    # GPS coordinates
    latitude = models.CharField(max_length=20, blank=True, null=True, help_text="GPS Latitude")
    longitude = models.CharField(max_length=20, blank=True, null=True, help_text="GPS Longitude")
    
    # Product details (manual entry)
    product_name = models.CharField(max_length=150, blank=True, null=True, help_text="Product name (e.g., Mince, Burger, Boerewors)")
    product_class = models.CharField(max_length=150, blank=True, null=True, help_text="Product class/category")

    # Sample and travel information
    is_sample_taken = models.BooleanField(blank=True, null=True, help_text="Was sample taken during inspection")
    bought_sample = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Value of bought sample in Rand (ZAR)")
    inspection_travel_distance_km = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Travel distance in kilometers")
    
    # New fields for manual entry
    km_traveled = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Manual entry of kilometers traveled")
    hours = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, help_text="Manual entry of hours worked")
    additional_email = models.EmailField(max_length=254, blank=True, null=True, help_text="Additional email for this specific inspection group")
    approved_status = models.CharField(max_length=10, blank=True, null=True, help_text="Approval status for this inspection group",
                                     choices=[
                                         ('PENDING', 'Pending'),
                                         ('APPROVED', 'Approved')
                                     ], default='PENDING')
    comment = models.TextField(blank=True, null=True, help_text="Comment for this inspection group")
    lab = models.CharField(max_length=20, blank=True, null=True, help_text="Laboratory used for testing",
                          choices=[
                              ('lab_a', 'Lab A'),
                              ('lab_b', 'Lab B'),
                              ('lab_c', 'Lab C'),
                              ('lab_d', 'Lab D'),
                              ('lab_e', 'Lab E'),
                              ('lab_f', 'Lab F')
                          ])
    
    # Reference information
    remote_id = models.IntegerField(blank=True, null=True, help_text="Original ID from remote system")
    client_name = models.CharField(max_length=200, blank=True, null=True, help_text="Client name (updated from Google Sheets if match found)")
    internal_account_code = models.CharField(max_length=100, blank=True, null=True, db_index=True, help_text="Internal Account Code from SQL Server (used to match with Google Sheets)")

    # Testing parameters
    fat = models.BooleanField(default=False, help_text="Fat testing required")
    protein = models.BooleanField(default=False, help_text="Protein testing required")
    calcium = models.BooleanField(default=False, help_text="Calcium testing required")
    dna = models.BooleanField(default=False, help_text="DNA testing required")
    needs_retest = models.CharField(max_length=3, blank=True, null=True, verbose_name='Needs Retest',
                                  choices=[('YES', 'Yes'), ('NO', 'No')], help_text="Whether this inspection needs retesting")
    
    # Document status tracking
    is_sent = models.BooleanField(default=False, help_text="Whether documents have been sent to client")
    sent_date = models.DateTimeField(blank=True, null=True, help_text="Date when documents were sent")
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='sent_inspections', help_text="User who marked documents as sent")
    
    # OneDrive upload tracking
    onedrive_uploaded = models.BooleanField(default=False, help_text="Whether files have been uploaded to OneDrive")
    onedrive_upload_date = models.DateTimeField(blank=True, null=True, help_text="Date when files were uploaded to OneDrive")
    onedrive_folder_id = models.CharField(max_length=255, blank=True, null=True, help_text="OneDrive folder ID where files are stored")
    
    # Document upload tracking
    rfi_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='rfi_uploads', help_text="User who uploaded RFI document")
    rfi_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when RFI was uploaded")
    invoice_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='invoice_uploads', help_text="User who uploaded Invoice document")
    invoice_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when Invoice was uploaded")
    coa_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='coa_uploads', help_text="User who uploaded COA document")
    coa_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when COA document was uploaded")
    lab_form_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='lab_form_uploads', help_text="User who uploaded Lab Form document")
    lab_form_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when Lab Form document was uploaded")
    retest_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='retest_uploads', help_text="User who uploaded Retest document")
    retest_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when Retest document was uploaded")
    occurrence_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='occurrence_uploads', help_text="User who uploaded Accurance document")
    occurrence_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when Accurance document was uploaded")
    composition_uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='composition_uploads', help_text="User who uploaded Composition document")
    composition_uploaded_date = models.DateTimeField(blank=True, null=True, help_text="Date when Composition document was uploaded")

    # Invoice number (editable field for tracking invoiced items)
    invoice_number = models.CharField(max_length=100, blank=True, null=True, help_text="Invoice number assigned to this inspection")

    # Manual entry flag - prevents sync from overwriting this inspection
    is_manual = models.BooleanField(default=False, help_text="True if this inspection was manually entered (not synced from SQL Server)")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'food_safety_agency_inspections'
        ordering = ['-date_of_inspection', '-created_at']
        verbose_name = "Food Safety Agency Inspection"
        verbose_name_plural = "Food Safety Agency Inspections"
        # IMPORTANT: Use composite key (commodity, remote_id) for uniqueness
        # This is a workaround for SQL Server database design issue where
        # each commodity table uses its own ID sequence, causing duplicate IDs
        unique_together = [['commodity', 'remote_id']]
        indexes = [
            models.Index(fields=['commodity']),
            models.Index(fields=['date_of_inspection']),
            models.Index(fields=['inspector_name']),
            models.Index(fields=['client_name']),
            models.Index(fields=['inspector_id']),
            models.Index(fields=['internal_account_code']),
            models.Index(fields=['commodity', 'remote_id']),  # Composite key index for performance
        ]

    @property
    def unique_inspection_id(self):
        """
        Generate globally unique inspection ID combining commodity and remote_id.
        This is necessary because the SQL Server database reuses inspection IDs
        across different commodity tables (e.g., ID 8487 exists in both RAW and PMP tables).

        Returns:
            str: Formatted as 'COMMODITY-REMOTEID' (e.g., 'RAW-8487', 'PMP-8487')
        """
        if self.commodity and self.remote_id:
            return f"{self.commodity}-{self.remote_id}"
        return str(self.remote_id) if self.remote_id else "Unknown"

    def __str__(self):
        return f"[{self.unique_inspection_id}] {self.inspector_name} - {self.client_name} - {self.date_of_inspection}"

    @property
    def rfi_uploaded(self):
        """Check if RFI document has been uploaded"""
        return self.rfi_uploaded_date is not None

    @property
    def invoice_uploaded(self):
        """Check if Invoice document has been uploaded"""
        return self.invoice_uploaded_date is not None

    @property
    def occurrence_uploaded(self):
        """Check if Accurance document has been uploaded"""
        return self.occurrence_uploaded_date is not None

class Shipment(models.Model):
    """Shipment/Claim data model for legal system"""
    
    # Basic identification
    Claim_No = models.CharField(max_length=100, unique=True, verbose_name='Shipment Number')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='shipments')
    client_reference = models.CharField(max_length=50, blank=True, null=True, verbose_name='Client Reference', 
                                     help_text='Auto-generated client-specific reference (e.g., ClientName-1-20250601)')
    
    # Claim details
    Brand = models.CharField(max_length=100, blank=True, null=True, verbose_name='Brand')
    Claimant = models.CharField(max_length=200, blank=True, null=True, verbose_name='Claimant Name')
    
    # Intent to claim
    Intent_To_Claim = models.CharField(max_length=3, blank=True, null=True, verbose_name='Intent To Claim',
                                     choices=[('YES', 'Yes'), ('NO', 'No')])
    Intend_Claim_Date = models.DateField(blank=True, null=True, verbose_name='Intent To Claim Date')
    
    # Formal claim
    Formal_Claim_Received = models.CharField(max_length=3, blank=True, null=True, verbose_name='Formal Claim',
                                          choices=[('YES', 'Yes'), ('NO', 'No')])
    Formal_Claim_Date_Received = models.DateField(blank=True, null=True, verbose_name='Formal Claim Date')
    
    # Financial information
    Claimed_Amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Value')
    Amount_Paid_By_Carrier = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Paid By Carrier')
    Amount_Paid_By_Awa = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Paid By ISCM/AWA')
    Amount_Paid_By_Insurance = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Paid By Insurance')
    Total_Savings = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Total Savings')
    Financial_Exposure = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name='Financial Exposure')
    
    # Status and settlement
    Settlement_Status = models.CharField(max_length=15, blank=True, null=True, verbose_name='Settled or Not Settled',
                                       choices=[('SETTLED', 'Settled'), ('NOT_SETTLED', 'Not Settled'), ('PARTIAL', 'Partially Settled')])
    Status = models.CharField(max_length=15, default='OPEN', verbose_name='Status',
                            choices=[('OPEN', 'Open'), ('PENDING', 'Pending'), ('CLOSED', 'Closed'), ('REJECTED', 'Rejected'), ('UNDER_REVIEW', 'Under Review')])
    Closed_Date = models.DateField(blank=True, null=True, verbose_name='Closed Date')
    
    # Branch information
    Branch = models.CharField(max_length=3, choices=[
        ('ATL', 'ATL'), ('CMU', 'CMU'), ('CON', 'CON'), ('DOR', 'DOR'), 
        ('HEC', 'HEC'), ('HNL', 'HNL'), ('HOU', 'HOU'), ('ICS', 'ICS'), 
        ('IMP', 'IMP'), ('JFK', 'JFK'), ('LCL', 'LCL'), ('ORD', 'ORD'), ('PPG', 'PPG')
    ])
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Shipment"
        verbose_name_plural = "Shipments"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['Claim_No']),
            models.Index(fields=['client']),
            models.Index(fields=['Status']),
            models.Index(fields=['Branch']),
            models.Index(fields=['client_reference']),
        ]
    
    def __str__(self):
        return f"{self.Claim_No} - {self.client.name if self.client else 'Unknown Client'}"
    
    def save(self, *args, **kwargs):
        # Generate client reference if not provided
        if not self.client_reference and self.client:
            # Get count of existing shipments for this client
            count = Shipment.objects.filter(client=self.client).count()
            # Format: ClientName-Count-Date
            date_str = self.created_at.strftime("%Y%m%d") if self.created_at else timezone.now().strftime("%Y%m%d")
            self.client_reference = f"{self.client.name.replace(' ', '')}-{count + 1}-{date_str}"
        
        super().save(*args, **kwargs)
    
    @property
    def is_closed(self):
        """Check if shipment is closed"""
        return self.Status == 'CLOSED'
    
    @property
    def total_paid(self):
        """Calculate total amount paid"""
        carrier = self.Amount_Paid_By_Carrier or 0
        awa = self.Amount_Paid_By_Awa or 0
        insurance = self.Amount_Paid_By_Insurance or 0
        return carrier + awa + insurance
    
    @property
    def net_exposure(self):
        """Calculate net financial exposure"""
        claimed = self.Claimed_Amount or 0
        total_paid = self.total_paid
        return claimed - total_paid

class Settings(models.Model):
    """Application settings model"""
    
    # System Settings
    auto_sync = models.BooleanField(default=False, help_text="Automatically sync data every 24 hours")
    backup_frequency = models.CharField(max_length=20, default='weekly', choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly')
    ], help_text="Backup frequency")
    session_timeout = models.IntegerField(default=30, help_text="Session timeout in minutes")
    dark_mode = models.BooleanField(default=False, help_text="Enable dark mode theme")
    
    # Data Sync Settings
    google_sheets_enabled = models.BooleanField(default=True, help_text="Enable Google Sheets integration")
    sql_server_enabled = models.BooleanField(default=True, help_text="Enable SQL Server integration")
    sync_interval = models.IntegerField(default=24, help_text="Sync interval value")
    sync_interval_unit = models.CharField(max_length=10, default='hours', choices=[
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
        ('days', 'Days')
    ], help_text="Sync interval unit")
    
    # Notification Settings
    email_notifications = models.BooleanField(default=False, help_text="Enable email notifications")
    sync_notifications = models.BooleanField(default=True, help_text="Notify when data synchronization completes")
    notification_email = models.EmailField(blank=True, null=True, help_text="Email address for notifications")
    
    # Security Settings
    two_factor_auth = models.BooleanField(default=False, help_text="Enable two-factor authentication")
    password_expiry = models.IntegerField(default=90, help_text="Password expiry in days")
    max_login_attempts = models.IntegerField(default=5, help_text="Maximum login attempts")
    
    # Compliance Document Settings
    compliance_auto_sync = models.BooleanField(default=False, help_text="Enable automatic compliance document syncing")
    compliance_sync_interval = models.IntegerField(default=5, help_text="Compliance sync interval value")
    compliance_sync_unit = models.CharField(max_length=10, default='minutes', choices=[
        ('minutes', 'Minutes'),
        ('hours', 'Hours'),
        ('days', 'Days')
    ], help_text="Compliance sync interval unit")
    compliance_batch_mode = models.CharField(max_length=20, default='batch', choices=[
        ('batch', 'Process in Batches'),
        ('all', 'Process ALL at Once')
    ], help_text="Processing mode: batches or all documents at once")
    compliance_batch_size = models.IntegerField(default=50, help_text="Number of inspections to process per batch (only for batch mode)")
    compliance_date_range = models.IntegerField(default=7, help_text="Process inspections from last N days (only for batch mode)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Settings"
        verbose_name_plural = "Settings"
    
    def __str__(self):
        return "Application Settings"
    
    @classmethod
    def get_settings(cls):
        """Get or create settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings

class SystemLog(models.Model):
    """System log to track user activities"""
    
    # User information
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='system_logs', verbose_name="User")
    
    # Activity details
    action = models.CharField(max_length=50, choices=[
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('CREATE', 'Create Record'),
        ('UPDATE', 'Update Record'),
        ('DELETE', 'Delete Record'),
        ('VIEW', 'View Page'),
        ('NAVIGATE', 'Navigate'),
        ('SYNC', 'Data Sync'),
        ('SETTINGS', 'Settings Change'),
        ('USER_MANAGEMENT', 'User Management'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('FILE_UPLOAD', 'File Upload'),
        ('EXPORT', 'Data Export'),
        ('IMPORT', 'Data Import'),
        ('SEARCH', 'Search'),
        ('FILTER', 'Filter'),
        ('ERROR', 'Error'),
        ('WARNING', 'Warning'),
        ('INFO', 'Information'),
    ], verbose_name="Action Type")
    
    # Page and object information
    page = models.CharField(max_length=100, blank=True, null=True, verbose_name="Page/URL")
    object_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="Object Type")
    object_id = models.CharField(max_length=50, blank=True, null=True, verbose_name="Object ID")
    
    # Details and metadata
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    details = models.JSONField(blank=True, null=True, verbose_name="Additional Details")
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name="IP Address")
    user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent")
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")
    
    class Meta:
        db_table = 'system_logs'
        ordering = ['-timestamp']
        verbose_name = "System Log"
        verbose_name_plural = "System Logs"
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['action']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['page']),
            models.Index(fields=['object_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @classmethod
    def log_activity(cls, user, action, page=None, object_type=None, object_id=None, 
                   description=None, details=None, ip_address=None, user_agent=None):
        """Convenience method to log user activity"""
        return cls.objects.create(
            user=user,
            action=action,
            page=page,
            object_type=object_type,
            object_id=object_id,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )


class Notification(models.Model):
    """Model to store system notifications for admins"""
    NOTIFICATION_TYPES = [
        ('error', 'Error'),
        ('warning', 'Warning'),
        ('info', 'Info'),
        ('success', 'Success'),
        ('sync', 'Sync Issue'),
        ('system', 'System Alert'),
    ]

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    # Basic fields
    title = models.CharField(max_length=255, help_text="Notification title")
    message = models.TextField(help_text="Notification message/description")
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='medium')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Target user (null = all super admins)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')

    # Optional reference to related object
    related_object_type = models.CharField(max_length=100, null=True, blank=True)
    related_object_id = models.CharField(max_length=100, null=True, blank=True)

    # Optional action URL
    action_url = models.CharField(max_length=500, null=True, blank=True, help_text="URL to navigate when clicked")

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at', 'is_read']),
        ]

    def __str__(self):
        return f"{self.notification_type.upper()}: {self.title}"

    @classmethod
    def create_notification(cls, title, message, notification_type='info', priority='medium', user=None, action_url=None):
        """Helper method to create notifications"""
        return cls.objects.create(
            title=title,
            message=message,
            notification_type=notification_type,
            priority=priority,
            user=user,
            action_url=action_url
        )

    @classmethod
    def notify_super_admins(cls, title, message, notification_type='info', priority='medium', action_url=None):
        """Create notification for all super admins and developers"""
        from django.contrib.auth.models import User
        super_admins = User.objects.filter(role__in=['super_admin', 'developer'])

        notifications = []
        for admin in super_admins:
            notifications.append(cls(
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                user=admin,
                action_url=action_url
            ))

        if notifications:
            cls.objects.bulk_create(notifications)
        return notifications


class ClientAllocation(models.Model):
    """
    Model to store client allocation data from Google Sheets
    This replicates the 'Internal Account Code Generator' sheet data
    """
    # Column A: Client ID (indexed for faster lookups)
    client_id = models.IntegerField(verbose_name="Client ID", db_index=True)

    # Column B: Facility Type (indexed for filtering)
    facility_type = models.CharField(max_length=100, blank=True, null=True, verbose_name="Facility Type", db_index=True)

    # Column C: Group Type (indexed for filtering)
    group_type = models.CharField(max_length=100, blank=True, null=True, verbose_name="Group Type", db_index=True)

    # Column D: Commodity (indexed for filtering)
    commodity = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commodity", db_index=True)

    # Column E: Province
    province = models.CharField(max_length=100, blank=True, null=True, verbose_name="Province")

    # Column F: Corporate Group
    corporate_group = models.CharField(max_length=200, blank=True, null=True, verbose_name="Corporate Group")

    # Column G: Other
    other = models.CharField(max_length=200, blank=True, null=True, verbose_name="Other")

    # Column H: Internal Account Code
    internal_account_code = models.CharField(max_length=100, blank=True, null=True, verbose_name="Internal Account Code", db_index=True)

    # Column I: Allocated (checkbox - TRUE/FALSE)
    allocated = models.BooleanField(default=False, verbose_name="Allocated")

    # Column J: E-Click Name
    eclick_name = models.CharField(max_length=200, blank=True, null=True, verbose_name="E-Click Name")

    # Column K: Representative Email Address
    representative_email = models.EmailField(max_length=254, blank=True, null=True, verbose_name="Representative Email Address")

    # Column L: Phone Number
    phone_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="Phone Number")

    # Column M: Duplicates
    duplicates = models.CharField(max_length=200, blank=True, null=True, verbose_name="Duplicates")

    # Column N: Active/Deactive
    active_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="Active/Deactive")

    # Metadata fields
    manually_added = models.BooleanField(default=False, verbose_name="Manually Added", help_text="True if added manually via UI, False if synced from sheets")
    last_synced = models.DateTimeField(auto_now=True, verbose_name="Last Synced")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        db_table = 'client_allocation'
        ordering = ['client_id']
        verbose_name = "Client Allocation"
        verbose_name_plural = "Client Allocations"
        indexes = [
            # Single column indexes for common filters
            models.Index(fields=['client_id'], name='idx_client_id'),
            models.Index(fields=['internal_account_code'], name='idx_account_code'),
            models.Index(fields=['allocated'], name='idx_allocated'),
            models.Index(fields=['facility_type'], name='idx_facility_type'),
            models.Index(fields=['commodity'], name='idx_commodity'),
            # Composite indexes for common query patterns
            models.Index(fields=['facility_type', 'commodity'], name='idx_facility_commodity'),
            models.Index(fields=['allocated', 'facility_type'], name='idx_alloc_facility'),
            models.Index(fields=['last_synced'], name='idx_last_synced'),
            # Covering index for list view (most common query)
            models.Index(fields=['client_id', 'allocated', 'facility_type'], name='idx_list_view'),
        ]
        constraints = [
            # Ensure client_id is unique and positive
            models.CheckConstraint(check=models.Q(client_id__gt=0), name='client_id_positive'),
        ]

    def __str__(self):
        return f"Client {self.client_id} - {self.internal_account_code or 'No Code'}"


class InspectionFee(models.Model):
    """Store inspection and testing fee rates"""
    fee_code = models.CharField(max_length=50, unique=True, help_text="Unique code for the fee (e.g., 'inspection_hour_rate')")
    fee_name = models.CharField(max_length=200, help_text="Display name for the fee")
    rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Current fee rate amount (always reflects latest rate)")
    description = models.TextField(blank=True, null=True, help_text="Description of the fee")
    last_updated = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'inspection_fees'
        ordering = ['fee_code']
        verbose_name = 'Inspection Fee'
        verbose_name_plural = 'Inspection Fees'

    def __str__(self):
        return f"{self.fee_name}: R{self.rate}"

    def get_rate_for_date(self, target_date):
        """
        Get the fee rate that was/is active on the target date.

        Args:
            target_date: A date or datetime object representing the date to query

        Returns:
            Decimal: The fee rate that was active on the target date

        Example:
            # Get rate for a specific inspection date
            fee = InspectionFee.objects.get(fee_code='inspection_hour_rate')
            rate = fee.get_rate_for_date(inspection.date_of_inspection)
        """
        # Convert datetime to date if necessary
        if hasattr(target_date, 'date'):
            target_date = target_date.date()

        # Find the most recent history entry where effective_date <= target_date
        history = self.history.filter(effective_date__lte=target_date).order_by('-effective_date').first()

        if history:
            return history.rate

        # Fallback to current rate if no history found
        # This handles cases where we're querying dates before any history was recorded
        return self.rate


class FeeHistory(models.Model):
    """
    Track historical changes to fee rates with effective dates.
    When a fee is changed, a new history record is created instead of overwriting the old rate.
    This allows for accurate historical fee lookups based on inspection dates.
    """
    fee = models.ForeignKey('InspectionFee', on_delete=models.CASCADE, related_name='history')
    rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Historical fee rate")
    effective_date = models.DateField(help_text="Date when this rate becomes/became active")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, help_text="User who created this fee version")
    created_at = models.DateTimeField(auto_now_add=True, help_text="When this history record was created")
    notes = models.TextField(blank=True, null=True, help_text="Optional notes about why the fee was changed")

    class Meta:
        db_table = 'inspection_fee_history'
        ordering = ['-effective_date', '-created_at']
        verbose_name = 'Fee History'
        verbose_name_plural = 'Fee Histories'
        indexes = [
            models.Index(fields=['fee', '-effective_date'], name='idx_fee_effective_date'),
            models.Index(fields=['effective_date'], name='idx_effective_date'),
        ]
        # Prevent duplicate effective dates for the same fee
        unique_together = [['fee', 'effective_date']]

    def __str__(self):
        return f"{self.fee.fee_name} - R{self.rate} (effective {self.effective_date})"


class Ticket(models.Model):
    """Model for FSA Operations Board tickets/issues"""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in-progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    # Basic Information
    title = models.CharField(max_length=200, help_text="Ticket title/summary")
    issue_type = models.CharField(max_length=50, blank=True, null=True, help_text="Type of issue (bug, feature, question, etc.)")
    affected_area = models.CharField(max_length=100, blank=True, null=True, help_text="Affected module/area of the system")

    # Description & Details
    description = models.TextField(help_text="Detailed description of the issue")
    steps_to_reproduce = models.TextField(blank=True, null=True, help_text="Steps to reproduce the issue")
    expected_behavior = models.TextField(blank=True, null=True, help_text="What should happen")
    actual_behavior = models.TextField(blank=True, null=True, help_text="What actually happened")

    # Priority & Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', help_text="Current status of the ticket")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium', help_text="Priority level")

    # Impact Assessment
    impact_users = models.CharField(max_length=50, blank=True, null=True, help_text="Number of affected users")
    is_blocking = models.CharField(max_length=20, blank=True, null=True, help_text="Is this blocking work?")

    # Additional Information
    browser_info = models.CharField(max_length=200, blank=True, null=True, help_text="Browser/device information")
    additional_notes = models.TextField(blank=True, null=True, help_text="Any other relevant details")

    # Assignment & Dates
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tickets', help_text="User who created the ticket")
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets', help_text="User assigned to handle this ticket")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True, help_text="Target completion date")

    class Meta:
        db_table = 'fsa_tickets'
        ordering = ['-created_at']
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        indexes = [
            models.Index(fields=['status'], name='idx_ticket_status'),
            models.Index(fields=['priority'], name='idx_ticket_priority'),
            models.Index(fields=['created_by'], name='idx_ticket_creator'),
            models.Index(fields=['assigned_to'], name='idx_ticket_assignee'),
            models.Index(fields=['-created_at'], name='idx_ticket_created'),
        ]

    def __str__(self):
        return f"#{self.id} - {self.title}"

