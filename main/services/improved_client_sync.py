"""
Improved Client Sync Service that handles foreign key relationships properly
"""
from django.db import transaction, connection
from django.contrib import messages
from ..models import Client, ClientEmail, Shipment
import uuid
import logging

logger = logging.getLogger(__name__)

class ImprovedClientSyncService:
    """An improved client sync service that handles foreign key relationships"""
    
    def sync_clients_from_sheets(self, sheet_data, preserve_shipments=True):
        """
        Sync clients from Google Sheets data with proper relationship handling
        
        Args:
            sheet_data: List of client data from Google Sheets
            preserve_shipments: If True, preserve shipments by updating clients instead of deleting
        """
        try:
            print("\n" + "="*60)
            print("🔄 STARTING IMPROVED CLIENT SYNC OPERATION")
            print("="*60)
            
            with transaction.atomic():
                initial_count = Client.objects.count()
                print(f"📊 Initial client count: {initial_count:,}")
                
                if preserve_shipments:
                    return self._sync_with_preservation(sheet_data, initial_count)
                else:
                    return self._sync_with_full_replacement(sheet_data, initial_count)
                    
        except Exception as e:
            print(f"❌ Sync failed: {str(e)}")
            logger.error(f"Client sync failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'deleted_count': 0,
                'clients_created': 0,
                'clients_updated': 0,
                'final_count': Client.objects.count()
            }
    
    def _sync_with_preservation(self, sheet_data, initial_count):
        """Sync clients while preserving existing shipments and relationships"""
        print("🛡️  Using preservation strategy - updating existing clients")
        
        clients_created = 0
        clients_updated = 0
        clients_processed = 0
        skipped_rows = 0
        
        # Get existing clients for comparison
        existing_clients = {}
        for client in Client.objects.all():
            # Index by both internal_account_code and name for flexible matching
            if client.internal_account_code:
                existing_clients[client.internal_account_code] = client
            existing_clients[client.name] = client
        
        print(f"📋 Found {len(existing_clients)} existing clients to potentially update")
        
        # Process sheet data
        for i, row_data in enumerate(sheet_data, 1):
            clients_processed += 1
            
            # Extract data
            internal_account_code = row_data.get('column_h', '').strip()
            client_name = row_data.get('column_j', '').strip()
            email = row_data.get('column_k', '').strip()
            
            # Skip empty rows
            if not client_name or not internal_account_code:
                skipped_rows += 1
                continue
            
            # Clean data
            if len(client_name) > 200:
                client_name = client_name[:200]
            
            if email and '@' not in email:
                email = ''
            if email and email.lower() == 'none':
                email = ''
            
            # Try to find existing client
            existing_client = existing_clients.get(internal_account_code) or existing_clients.get(client_name)
            
            if existing_client:
                # Update existing client
                updated = False
                if existing_client.name != client_name:
                    existing_client.name = client_name
                    updated = True
                if existing_client.internal_account_code != internal_account_code:
                    existing_client.internal_account_code = internal_account_code
                    updated = True
                if existing_client.email != (email if email else None):
                    existing_client.email = email if email else None
                    updated = True
                
                if updated:
                    existing_client.save()
                    clients_updated += 1
                    if i <= 5:
                        print(f"      ✅ Updated client {i}: {client_name}")
            else:
                # Create new client
                unique_id = f"CL{uuid.uuid4().hex[:8].upper()}{i:04d}"
                new_client = Client.objects.create(
                    name=client_name,
                    client_id=unique_id,
                    internal_account_code=internal_account_code,
                    email=email if email else None
                )
                clients_created += 1
                if i <= 5:
                    print(f"      ✅ Created client {i}: {client_name}")
        
        final_count = Client.objects.count()
        
        print(f"📈 Summary:")
        print(f"   Created: {clients_created} new clients")
        print(f"   Updated: {clients_updated} existing clients") 
        print(f"   Skipped: {skipped_rows} empty rows")
        print(f"   Final count: {final_count:,}")
        
        return {
            'success': True,
            'deleted_count': 0,  # No deletions with preservation strategy
            'clients_created': clients_created,
            'clients_updated': clients_updated,
            'total_processed': clients_processed,
            'final_count': final_count
        }
    
    def _sync_with_full_replacement(self, sheet_data, initial_count):
        """Sync clients with full replacement (handles cascading deletes)"""
        print("🗑️  Using full replacement strategy - this will delete related data")
        
        # Check what will be deleted
        shipment_count = Shipment.objects.count()
        client_email_count = ClientEmail.objects.count()
        
        print(f"⚠️  This will also delete:")
        print(f"   📦 {shipment_count:,} shipments")
        print(f"   📧 {client_email_count:,} additional client emails")
        
        if shipment_count > 0:
            print("❌ Aborting: Cannot delete clients with existing shipments")
            print("   Use preserve_shipments=True for safer sync")
            raise Exception("Cannot delete clients with existing shipments")
        
        # Proceed with deletion if no critical data
        print("🗑️  Clearing existing clients...")
        deleted_count = Client.objects.count()
        Client.objects.all().delete()
        print(f"✅ Deleted {deleted_count:,} clients and related data")
        
        # Create new clients
        clients_created = 0
        skipped_rows = 0
        client_objects = []
        
        for i, row_data in enumerate(sheet_data, 1):
            internal_account_code = row_data.get('column_h', '').strip()
            client_name = row_data.get('column_j', '').strip()
            email = row_data.get('column_k', '').strip()
            
            if not client_name or not internal_account_code:
                skipped_rows += 1
                continue
            
            # Clean data
            if len(client_name) > 200:
                client_name = client_name[:200]
            if email and '@' not in email:
                email = ''
            if email and email.lower() == 'none':
                email = ''
            
            unique_id = f"CL{uuid.uuid4().hex[:8].upper()}{i:04d}"
            client_obj = Client(
                name=client_name,
                client_id=unique_id,
                internal_account_code=internal_account_code,
                email=email if email else None
            )
            client_objects.append(client_obj)
            clients_created += 1
        
        # Bulk create
        if client_objects:
            print(f"🚀 Bulk creating {len(client_objects):,} clients...")
            Client.objects.bulk_create(client_objects, batch_size=1000)
        
        final_count = Client.objects.count()
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'clients_created': clients_created,
            'clients_updated': 0,
            'total_processed': len(sheet_data),
            'final_count': final_count
        }
