from django.core.management.base import BaseCommand
from main.models import FoodSafetyAgencyInspection, InspectorMapping, User


class Command(BaseCommand):
    help = 'Fix all inspector mappings to match actual inspection data'

    def handle(self, *args, **options):
        self.stdout.write("=== FIXING INSPECTOR MAPPINGS ===")
        
        # Get all unique inspector names and IDs from actual data
        actual_inspectors = FoodSafetyAgencyInspection.objects.values(
            'inspector_id', 'inspector_name'
        ).distinct().order_by('inspector_id')
        
        self.stdout.write(f"Found {actual_inspectors.count()} unique inspectors in data")
        
        # Clear all existing mappings
        self.stdout.write("Clearing all existing mappings...")
        InspectorMapping.objects.all().delete()
        
        # Create correct mappings from actual data
        created_count = 0
        for inspector in actual_inspectors:
            if inspector['inspector_name'] and inspector['inspector_name'] != 'Unknown':
                mapping, created = InspectorMapping.objects.get_or_create(
                    inspector_id=inspector['inspector_id'],
                    defaults={
                        'inspector_name': inspector['inspector_name'],
                        'is_active': True
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"  ✅ Created: {inspector['inspector_name']} (ID: {inspector['inspector_id']})")
                else:
                    self.stdout.write(f"  ⚠️  Already exists: {inspector['inspector_name']} (ID: {inspector['inspector_id']})")
        
        self.stdout.write(f"\nCreated {created_count} new mappings")
        
        # Check for users without mappings and create them
        self.stdout.write("\n=== Creating mappings for users without them ===")
        inspector_users = User.objects.filter(role='inspector')
        user_mappings_created = 0
        
        for user in inspector_users:
            full_name = user.get_full_name() or user.username
            
            # Try to find this user in the actual inspection data
            matching_inspector = FoodSafetyAgencyInspection.objects.filter(
                inspector_name=full_name
            ).first()
            
            if matching_inspector:
                mapping, created = InspectorMapping.objects.get_or_create(
                    inspector_id=matching_inspector.inspector_id,
                    defaults={
                        'inspector_name': full_name,
                        'is_active': True
                    }
                )
                if created:
                    user_mappings_created += 1
                    self.stdout.write(f"  ✅ Created user mapping: {full_name} (ID: {matching_inspector.inspector_id})")
                else:
                    self.stdout.write(f"  ⚠️  User mapping already exists: {full_name}")
            else:
                # Try partial matching
                partial_match = FoodSafetyAgencyInspection.objects.filter(
                    inspector_name__icontains=full_name.split()[0] if ' ' in full_name else full_name
                ).first()
                
                if partial_match:
                    mapping, created = InspectorMapping.objects.get_or_create(
                        inspector_id=partial_match.inspector_id,
                        defaults={
                            'inspector_name': full_name,
                            'is_active': True
                        }
                    )
                    if created:
                        user_mappings_created += 1
                        self.stdout.write(f"  ✅ Created partial match: {full_name} -> {partial_match.inspector_name} (ID: {partial_match.inspector_id})")
                else:
                    self.stdout.write(f"  ❌ No match found for user: {full_name}")
        
        self.stdout.write(f"\nCreated {user_mappings_created} user mappings")
        
        # Final summary
        total_mappings = InspectorMapping.objects.count()
        self.stdout.write(f"\n=== FINAL SUMMARY ===")
        self.stdout.write(f"Total mappings: {total_mappings}")
        self.stdout.write(f"Created from data: {created_count}")
        self.stdout.write(f"Created for users: {user_mappings_created}")
        
        # Verify all users now have mappings
        users_without_mappings = []
        for user in inspector_users:
            full_name = user.get_full_name() or user.username
            if not InspectorMapping.objects.filter(inspector_name=full_name).exists():
                users_without_mappings.append(full_name)
        
        if users_without_mappings:
            self.stdout.write(f"\n⚠️  Users still without mappings: {users_without_mappings}")
        else:
            self.stdout.write(f"\n✅ All inspector users now have mappings!")
        
        self.stdout.write(self.style.SUCCESS("Inspector mapping fix completed!"))
