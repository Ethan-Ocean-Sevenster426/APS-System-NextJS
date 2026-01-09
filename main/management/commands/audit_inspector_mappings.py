from django.core.management.base import BaseCommand
from main.models import FoodSafetyAgencyInspection, InspectorMapping, User


class Command(BaseCommand):
    help = 'Audit inspector mappings for correctness'

    def handle(self, *args, **options):
        self.stdout.write("=== AUDIT: Inspector Mappings vs Actual Data ===")
        
        # Get all mappings and actual data
        mappings = InspectorMapping.objects.all()
        actual_ids = set(FoodSafetyAgencyInspection.objects.values_list('inspector_id', flat=True).distinct())
        
        self.stdout.write(f"Total mappings: {mappings.count()}")
        self.stdout.write(f"Unique inspector IDs in data: {len(actual_ids)}")
        
        # Check for conflicts
        self.stdout.write("\n=== Checking for conflicts ===")
        conflicts = []
        missing_mappings = []
        
        for mapping in mappings:
            actual_inspectors = FoodSafetyAgencyInspection.objects.filter(
                inspector_id=mapping.inspector_id
            ).values_list('inspector_name', flat=True).distinct()
            
            if actual_inspectors and mapping.inspector_name not in actual_inspectors:
                conflicts.append((mapping.inspector_name, mapping.inspector_id, list(actual_inspectors)))
        
        # Check for inspectors in data without mappings
        for inspector_id in actual_ids:
            if not InspectorMapping.objects.filter(inspector_id=inspector_id).exists():
                actual_names = FoodSafetyAgencyInspection.objects.filter(
                    inspector_id=inspector_id
                ).values_list('inspector_name', flat=True).distinct()
                missing_mappings.append((inspector_id, list(actual_names)))
        
        self.stdout.write(f"Found {len(conflicts)} conflicts:")
        for conflict in conflicts[:10]:  # Show first 10
            self.stdout.write(f"  Mapping: {conflict[0]} (ID {conflict[1]}) -> Actual: {conflict[2]}")
        
        self.stdout.write(f"\nFound {len(missing_mappings)} missing mappings:")
        for missing in missing_mappings[:10]:  # Show first 10
            self.stdout.write(f"  ID {missing[0]} -> Names: {missing[1]}")
        
        # Check users without mappings
        self.stdout.write("\n=== Checking users without mappings ===")
        inspector_users = User.objects.filter(role='inspector')
        users_without_mappings = []
        
        for user in inspector_users:
            full_name = user.get_full_name() or user.username
            if not InspectorMapping.objects.filter(inspector_name=full_name).exists():
                users_without_mappings.append((user.username, full_name))
        
        self.stdout.write(f"Found {len(users_without_mappings)} users without mappings:")
        for user_info in users_without_mappings:
            self.stdout.write(f"  {user_info[0]} ({user_info[1]})")
        
        # Summary
        self.stdout.write(f"\n=== SUMMARY ===")
        self.stdout.write(f"Total conflicts: {len(conflicts)}")
        self.stdout.write(f"Missing mappings: {len(missing_mappings)}")
        self.stdout.write(f"Users without mappings: {len(users_without_mappings)}")
        
        if conflicts or missing_mappings or users_without_mappings:
            self.stdout.write(self.style.WARNING("Issues found that need to be fixed!"))
        else:
            self.stdout.write(self.style.SUCCESS("All inspector mappings are correct!"))
