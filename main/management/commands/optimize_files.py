#!/usr/bin/env python3
"""
Management command to optimize file access performance
- Clean up old local files (older than 60 days)
- Warm up Redis cache with recent file metadata
- Optimize file loading performance
"""

import os
import sys
import django
import json
import requests
from datetime import datetime, timedelta
from django.conf import settings

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.core.cache import cache
from django.core.management.base import BaseCommand
from main.models import FoodSafetyAgencyInspection, Client


class Command(BaseCommand):
    help = 'Optimize file access performance by cleaning old files and warming cache'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup-only',
            action='store_true',
            help='Only clean up old local files',
        )
        parser.add_argument(
            '--cache-only',
            action='store_true',
            help='Only warm up Redis cache',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=60,
            help='Number of days to keep local files (default: 60)',
        )
    
    def handle(self, *args, **options):
        cleanup_only = options['cleanup_only']
        cache_only = options['cache_only']
        days = options['days']
        
        if not cleanup_only:
            self.stdout.write("🔄 Starting file access optimization...")
        
        if not cache_only:
            self.cleanup_old_local_files(days)
        
        if not cleanup_only:
            self.warm_up_cache()
        
        self.stdout.write("✅ File access optimization completed!")
    
    def cleanup_old_local_files(self, days):
        """Clean up local files older than specified days."""
        try:
            from datetime import datetime, timedelta
            import shutil
            
            media_root = settings.MEDIA_ROOT
            inspection_path = os.path.join(media_root, 'inspection')
            
            if not os.path.exists(inspection_path):
                self.stdout.write("ℹ️ No inspection folder found")
                return
            
            cutoff_date = datetime.now() - timedelta(days=days)
            deleted_count = 0
            deleted_size = 0
            
            # Walk through inspection folders
            for year_folder in os.listdir(inspection_path):
                year_path = os.path.join(inspection_path, year_folder)
                if not os.path.isdir(year_path):
                    continue
                
                for month_folder in os.listdir(year_path):
                    month_path = os.path.join(year_path, month_folder)
                    if not os.path.isdir(month_path):
                        continue
                    
                    # Check if this month is older than specified days
                    try:
                        month_date = datetime.strptime(f"{year_folder}-{month_folder}-01", "%Y-%B-%d")
                        if month_date < cutoff_date:
                            # Calculate size before deletion
                            folder_size = self.get_folder_size(month_path)
                            
                            # Delete entire month folder
                            shutil.rmtree(month_path)
                            deleted_count += 1
                            deleted_size += folder_size
                            
                            self.stdout.write(f"🗑️ Cleaned up: {month_path} ({self.format_size(folder_size)})")
                    except ValueError:
                        # Skip invalid month names
                        continue
            
            if deleted_count > 0:
                self.stdout.write(f"✅ Cleaned up {deleted_count} old directories ({self.format_size(deleted_size)})")
            else:
                self.stdout.write("ℹ️ No old files to clean up")
            
        except Exception as e:
            self.stdout.write(f"❌ Error cleaning up files: {e}")
    
    def warm_up_cache(self):
        """Warm up Redis cache with recent file metadata."""
        try:
            # Get recent inspections (last 60 days)
            cutoff_date = datetime.now() - timedelta(days=60)
            recent_inspections = FoodSafetyAgencyInspection.objects.filter(
                date_of_inspection__gte=cutoff_date
            ).values('client_name', 'date_of_inspection').distinct()
            
            self.stdout.write(f"📋 Warming cache for {recent_inspections.count()} recent inspections...")
            
            # Load OneDrive tokens
            token_file = os.path.join(settings.BASE_DIR, 'onedrive_tokens.json')
            if not os.path.exists(token_file):
                self.stdout.write("⚠️ No OneDrive tokens found, skipping cache warm-up")
                return
            
            with open(token_file, 'r') as f:
                token_data = json.load(f)
            
            access_token = token_data.get('access_token')
            if not access_token:
                self.stdout.write("⚠️ No OneDrive access token, skipping cache warm-up")
                return
            
            cached_count = 0
            
            for inspection in recent_inspections:
                try:
                    client_name = inspection['client_name']
                    date_of_inspection = inspection['date_of_inspection']
                    
                    # Build cache key
                    year_folder = date_of_inspection.strftime('%Y')
                    month_folder = date_of_inspection.strftime('%B')
                    
                    import re
                    client_folder = re.sub(r'[^a-zA-Z0-9_]', '_', client_name)
                    client_folder = re.sub(r'_+', '_', client_folder).strip('_')
                    
                    cache_key = f"client_files:{client_folder}:{year_folder}:{month_folder}"
                    
                    # Check if already cached
                    if cache.get(cache_key):
                        continue
                    
                    # Get files from OneDrive and cache them
                    files = self.get_onedrive_files_for_inspection(
                        access_token, client_folder, year_folder, month_folder
                    )
                    
                    if files:
                        cache.set(cache_key, files, 60 * 60 * 24 * 7)  # 7 days
                        cached_count += 1
                        
                        if cached_count % 10 == 0:
                            self.stdout.write(f"📋 Cached {cached_count} inspections...")
                
                except Exception as e:
                    self.stdout.write(f"⚠️ Error caching {client_name}: {e}")
                    continue
            
            self.stdout.write(f"✅ Cache warm-up completed: {cached_count} inspections cached")
            
        except Exception as e:
            self.stdout.write(f"❌ Error warming cache: {e}")
    
    def get_onedrive_files_for_inspection(self, access_token, client_folder, year_folder, month_folder):
        """Get files from OneDrive for a specific inspection."""
        try:
            onedrive_base = getattr(settings, 'ONEDRIVE_FOLDER', 'FoodSafety Agency Inspections')
            base_path = f"{onedrive_base}/inspection/{year_folder}/{month_folder}/{client_folder}"
            
            files = []
            
            # Check compliance subfolders
            compliance_base = f"{base_path}/Compliance"
            for commodity in ['RAW', 'PMP', 'POULTRY', 'EGGS']:
                commodity_path = f"{compliance_base}/{commodity}"
                
                # Get files from OneDrive
                check_url = f"https://graph.microsoft.com/v1.0/me/drive/root:/{commodity_path}:/children"
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                response = requests.get(check_url, headers=headers)
                if response.status_code == 200:
                    onedrive_files = response.json().get('value', [])
                    for file_info in onedrive_files:
                        if file_info.get('file'):
                            file_metadata = {
                                'name': file_info['name'],
                                'size': file_info.get('size', 0),
                                'commodity': commodity,
                                'client_folder': client_folder,
                                'year_folder': year_folder,
                                'month_folder': month_folder,
                                'onedrive_path': f"{commodity_path}/{file_info['name']}",
                                'local_path': f"inspection/{year_folder}/{month_folder}/{client_folder}/Compliance/{commodity}/{file_info['name']}",
                                'cached_at': datetime.now().isoformat(),
                                'source': 'onedrive'
                            }
                            files.append(file_metadata)
            
            return files
            
        except Exception as e:
            return []
    
    def get_folder_size(self, folder_path):
        """Get total size of a folder in bytes."""
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                if os.path.exists(file_path):
                    total_size += os.path.getsize(file_path)
        return total_size
    
    def format_size(self, size_bytes):
        """Format size in human readable format."""
        if size_bytes == 0:
            return "0B"
        
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.1f}{size_names[i]}"


if __name__ == "__main__":
    # Run as standalone script
    command = Command()
    command.handle()
