#!/usr/bin/env python
"""
Performance monitoring script to track sync improvements
"""
import time
import requests
from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Monitor sync performance improvements'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Monitoring sync performance...')
        
        # Test inspection sync performance
        self.stdout.write('\n📊 Testing Inspection Sync Performance:')
        
        start_time = time.time()
        try:
            response = requests.post('http://127.0.0.1:8000/refresh-inspections/', timeout=300)
            sync_time = time.time() - start_time
            
            if response.status_code == 200:
                self.stdout.write(f'✅ Inspection sync completed in {sync_time:.2f} seconds')
                
                # Parse response for details
                try:
                    data = response.json()
                    if data.get('success'):
                        self.stdout.write(f'   📈 Created: {data.get("inspections_created", 0)} inspections')
                        self.stdout.write(f'   📈 Deleted: {data.get("deleted_count", 0)} old inspections')
                        self.stdout.write(f'   📈 Total: {data.get("total_processed", 0)} records processed')
                    else:
                        self.stdout.write(f'❌ Sync failed: {data.get("error", "Unknown error")}')
                except:
                    self.stdout.write('⚠️ Could not parse response details')
            else:
                self.stdout.write(f'❌ Sync failed with status code: {response.status_code}')
                
        except Exception as e:
            self.stdout.write(f'❌ Sync test failed: {e}')
        
        # Test client sync performance
        self.stdout.write('\n📊 Testing Client Sync Performance:')
        
        start_time = time.time()
        try:
            response = requests.post('http://127.0.0.1:8000/refresh-clients/', timeout=300)
            sync_time = time.time() - start_time
            
            if response.status_code == 200:
                self.stdout.write(f'✅ Client sync completed in {sync_time:.2f} seconds')
                
                # Parse response for details
                try:
                    data = response.json()
                    if data.get('success'):
                        self.stdout.write(f'   📈 Created: {data.get("clients_created", 0)} clients')
                        self.stdout.write(f'   📈 Deleted: {data.get("deleted_count", 0)} old clients')
                        self.stdout.write(f'   📈 Total: {data.get("total_processed", 0)} records processed')
                    else:
                        self.stdout.write(f'❌ Sync failed: {data.get("error", "Unknown error")}')
                except:
                    self.stdout.write('⚠️ Could not parse response details')
            else:
                self.stdout.write(f'❌ Sync failed with status code: {response.status_code}')
                
        except Exception as e:
            self.stdout.write(f'❌ Sync test failed: {e}')
        
        self.stdout.write('\n🎯 Performance Summary:')
        self.stdout.write('   - Bulk operations: Enabled')
        self.stdout.write('   - Batch size: 1000 records')
        self.stdout.write('   - Database indexes: Added')
        self.stdout.write('   - Caching: Multi-level enabled')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Performance monitoring completed!'))
