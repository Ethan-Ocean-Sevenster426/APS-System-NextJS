"""
OneDrive automatic upload background process
Uploads inspection files to OneDrive after 3 days of being marked as sent
"""

import os
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q
from django.conf import settings

from ..models import FoodSafetyAgencyInspection
from .onedrive_utils import (
    get_valid_access_token, 
    create_monthly_folder_structure, 
    upload_inspection_files_to_onedrive
)


def get_inspections_ready_for_upload():
    """
    Get inspections that have been marked as sent for the configured delay period
    and haven't been uploaded to OneDrive yet
    """
    from main.models import SystemSettings
    
    # Get the configured upload delay from settings
    settings = SystemSettings.get_settings()
    delay_days = settings.onedrive_upload_delay_days
    delay_unit = settings.onedrive_upload_delay_unit
    
    # Calculate the delay based on the unit
    if delay_unit == 'hours':
        delay = timedelta(hours=delay_days)
    elif delay_unit == 'days':
        delay = timedelta(days=delay_days)
    elif delay_unit == 'weeks':
        delay = timedelta(weeks=delay_days)
    elif delay_unit == 'months':
        delay = timedelta(days=delay_days * 30)  # Approximate month as 30 days
    elif delay_unit == 'years':
        delay = timedelta(days=delay_days * 365)  # Approximate year as 365 days
    else:
        delay = timedelta(days=3)  # Default fallback
    
    delay_time_ago = timezone.now() - delay
    
    # Find inspections marked as sent after the delay period
    inspections = FoodSafetyAgencyInspection.objects.filter(
        is_sent=True,
        sent_date__lt=delay_time_ago,
        onedrive_uploaded=False
    ).order_by('sent_date')
    
    return inspections


def group_inspections_by_month(inspections):
    """
    Group inspections by their sent month for organized folder structure
    """
    monthly_groups = {}
    
    for inspection in inspections:
        # Use sent_date or created_at as fallback
        date_to_use = inspection.sent_date or inspection.created_at
        year = date_to_use.year
        month = date_to_use.month
        
        key = (year, month)
        if key not in monthly_groups:
            monthly_groups[key] = []
        monthly_groups[key].append(inspection)
    
    return monthly_groups


def process_inspections_for_upload():
    """
    Main function to process inspections and upload them to OneDrive
    """
    print("🚀 Starting OneDrive auto-upload process...")
    
    # Check if OneDrive is connected
    access_token = get_valid_access_token()
    if not access_token:
        print("❌ OneDrive not connected. Please complete OAuth flow first.")
        return False
    
    print("✅ OneDrive connection verified")
    
    # Get inspections ready for upload
    inspections = get_inspections_ready_for_upload()
    
    if not inspections.exists():
        print("ℹ️ No inspections ready for OneDrive upload")
        return True
    
    print(f"📋 Found {inspections.count()} inspections ready for upload")
    
    # Group by month
    monthly_groups = group_inspections_by_month(inspections)
    
    total_uploaded = 0
    total_failed = 0
    
    for (year, month), month_inspections in monthly_groups.items():
        print(f"\n📁 Processing {len(month_inspections)} inspections for {month:02d}/{year}")
        
        # Create monthly folder structure
        month_folder_id = create_monthly_folder_structure(year, month)
        
        if not month_folder_id:
            print(f"❌ Failed to create folder structure for {month:02d}/{year}")
            total_failed += len(month_inspections)
            continue
        
        # Process each inspection in this month
        for inspection in month_inspections:
            print(f"  📄 Processing inspection {inspection.remote_id} ({inspection.client_name})")
            
            try:
                success = upload_inspection_files_to_onedrive(inspection, month_folder_id)
                
                if success:
                    # Mark as uploaded
                    inspection.onedrive_uploaded = True
                    inspection.onedrive_upload_date = timezone.now()
                    inspection.save()
                    total_uploaded += 1
                    print(f"    ✅ Successfully uploaded files for inspection {inspection.remote_id}")
                else:
                    total_failed += 1
                    print(f"    ❌ Failed to upload files for inspection {inspection.remote_id}")
                    
            except Exception as e:
                print(f"    ❌ Error processing inspection {inspection.remote_id}: {str(e)}")
                total_failed += 1
    
    print(f"\n🎉 OneDrive auto-upload completed!")
    print(f"   ✅ Successfully uploaded: {total_uploaded} inspections")
    print(f"   ❌ Failed: {total_failed} inspections")
    
    return total_failed == 0


def get_upload_statistics():
    """
    Get statistics about OneDrive uploads
    """
    total_sent = FoodSafetyAgencyInspection.objects.filter(is_sent=True).count()
    total_uploaded = FoodSafetyAgencyInspection.objects.filter(onedrive_uploaded=True).count()
    pending_upload = FoodSafetyAgencyInspection.objects.filter(
        is_sent=True,
        onedrive_uploaded=False
    ).count()
    
    return {
        'total_sent': total_sent,
        'total_uploaded': total_uploaded,
        'pending_upload': pending_upload,
        'upload_percentage': (total_uploaded / total_sent * 100) if total_sent > 0 else 0
    }
