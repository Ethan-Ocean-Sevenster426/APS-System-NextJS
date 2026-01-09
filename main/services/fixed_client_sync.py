"""
Fixed Client Sync Service - A working implementation that actually syncs clients
"""
from django.db import transaction
from django.contrib import messages
from ..models import Client
import uuid


class FixedClientSyncService:
    """A working client sync service that actually performs database operations"""
    
    def sync_clients_from_sheets(self, sheet_data):
        """Sync clients from Google Sheets data with proper error handling"""
        try:
            print("\n" + "="*60)
            print("🔄 STARTING FIXED CLIENT SYNC OPERATION")
            print("="*60)
            
            with transaction.atomic():
                # Step 1: Clear existing clients
                print("🗑️  Step 1: Clearing existing clients...")
                deleted_count = Client.objects.count()
                print(f"   📊 Found {deleted_count} existing clients to delete")
                
                Client.objects.all().delete()
                print(f"   ✅ Successfully deleted {deleted_count} existing clients")
                
                # Step 2: Create new clients
                print("\n📥 Step 2: Creating new clients...")
                clients_created = 0
                skipped_rows = 0
                
                for i, row_data in enumerate(sheet_data, 1):
                    # Extract data from row
                    internal_account_code = row_data.get('column_h', '').strip()
                    client_name = row_data.get('column_j', '').strip()
                    email = row_data.get('column_k', '').strip()
                    
                    # Skip empty rows
                    if not client_name or not internal_account_code:
                        skipped_rows += 1
                        continue
                    
                    # Clean email
                    if email and '@' not in email:
                        email = ''
                    if email.lower() == 'none':
                        email = ''
                    
                    # Generate unique client_id
                    unique_id = f"CL{uuid.uuid4().hex[:8].upper()}{i:04d}"
                    
                    # Create client
                    try:
                        client = Client.objects.create(
                            name=client_name,
                            client_id=unique_id,
                            internal_account_code=internal_account_code,
                            email=email if email else None
                        )
                        clients_created += 1
                        
                        if i <= 5:  # Show first 5 for debugging
                            print(f"   ✅ Created client {i}: {client_name}")
                            
                    except Exception as e:
                        print(f"   ⚠️ Failed to create client {client_name}: {str(e)}")
                        continue
                
                print(f"\n📈 Summary:")
                print(f"   📊 Deleted: {deleted_count} old clients")
                print(f"   📊 Created: {clients_created} new clients")
                print(f"   📊 Skipped: {skipped_rows} empty rows")
                
                # Verify the operation worked
                final_count = Client.objects.count()
                print(f"   📊 Final count: {final_count} clients")
                
                if final_count != clients_created:
                    raise Exception(f"Sync failed: Expected {clients_created} clients, but database has {final_count}")
                
                return {
                    'success': True,
                    'deleted_count': deleted_count,
                    'clients_created': clients_created,
                    'skipped_rows': skipped_rows,
                    'final_count': final_count
                }
                
        except Exception as e:
            print(f"❌ Sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'deleted_count': 0,
                'clients_created': 0,
                'final_count': 0
            }
