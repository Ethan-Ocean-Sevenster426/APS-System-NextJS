from django.core.management.base import BaseCommand
from main.models import FoodSafetyAgencyInspection, InspectorMapping, User


class Command(BaseCommand):
    help = 'Validate and auto-fix inspector mappings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--auto-fix',
            action='store_true',
            help='Automatically fix missing mappings',
        )

    def handle(self, *args, **options):
        self.stdout.write("=== VALIDATING INSPECTOR MAPPINGS ===")
        
        # Check for conflicts
        conflicts = []
        mappings = InspectorMapping.objects.all()
        
        for mapping in mappings:
            actual_inspectors = FoodSafetyAgencyInspection.objects.filter(
                inspector_id=mapping.inspector_id
            ).values_list('inspector_name', flat=True).distinct()
            
            if actual_inspectors and mapping.inspector_name not in actual_inspectors:
                conflicts.append((mapping.inspector_name, mapping.inspector_id, list(actual_inspectors)))
        
        # Check for users without mappings
        inspector_users = User.objects.filter(role='inspector')
        users_without_mappings = []
        
        for user in inspector_users:
            full_name = user.get_full_name() or user.username
            if not InspectorMapping.objects.filter(inspector_name=full_name).exists():
                users_without_mappings.append((user.username, full_name))
        
        # Check for missing mappings (inspectors in data without mappings)
        actual_ids = set(FoodSafetyAgencyInspection.objects.values_list('inspector_id', flat=True).distinct())
        mapped_ids = set(InspectorMapping.objects.values_list('inspector_id', flat=True))
        missing_ids = actual_ids - mapped_ids
        
        missing_mappings = []
        for inspector_id in missing_ids:
            actual_names = list(FoodSafetyAgencyInspection.objects.filter(
                inspector_id=inspector_id
            ).values_list('inspector_name', flat=True).distinct())
            missing_mappings.append((inspector_id, actual_names))
        
        # Report issues
        if conflicts:
            self.stdout.write(self.style.WARNING(f"Found {len(conflicts)} conflicts:"))
            for conflict in conflicts:
                actual_names_str = ', '.join(conflict[2][:3])  # Show only first 3 names
                if len(conflict[2]) > 3:
                    actual_names_str += f" ... and {len(conflict[2]) - 3} more"
                self.stdout.write(f"  ❌ {conflict[0]} (ID {conflict[1]}) -> Actual: {actual_names_str}")
        
        if users_without_mappings:
            self.stdout.write(self.style.WARNING(f"Found {len(users_without_mappings)} users without mappings:"))
            for user_info in users_without_mappings:
                self.stdout.write(f"  ❌ {user_info[0]} ({user_info[1]})")
        
        if missing_mappings:
            self.stdout.write(self.style.WARNING(f"Found {len(missing_mappings)} missing mappings:"))
            for missing in missing_mappings:
                names_str = ', '.join(missing[1][:5])  # Show only first 5 names
                if len(missing[1]) > 5:
                    names_str += f" ... and {len(missing[1]) - 5} more"
                self.stdout.write(f"  ❌ ID {missing[0]} -> Names: {names_str}")
        
        # Auto-fix if requested
        if options['auto_fix']:
            self.stdout.write("\n=== AUTO-FIXING ISSUES ===")
            
            # Fix missing mappings for users
            fixed_users = 0
            for username, full_name in users_without_mappings:
                # Try to find in actual data
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
                        fixed_users += 1
                        self.stdout.write(f"  ✅ Created mapping for {full_name} (ID: {matching_inspector.inspector_id})")
                else:
                    # Create with dummy ID
                    mapping, created = InspectorMapping.objects.get_or_create(
                        inspector_name=full_name,
                        defaults={
                            'inspector_id': 9000 + len(users_without_mappings) - fixed_users,
                            'is_active': True
                        }
                    )
                    if created:
                        fixed_users += 1
                        self.stdout.write(f"  ⚠️  Created dummy mapping for {full_name}")
            
            # Fix missing mappings for actual data
            fixed_data = 0
            for inspector_id, names in missing_mappings:
                if names and names[0] != 'Unknown':
                    mapping, created = InspectorMapping.objects.get_or_create(
                        inspector_id=inspector_id,
                        defaults={
                            'inspector_name': names[0],
                            'is_active': True
                        }
                    )
                    if created:
                        fixed_data += 1
                        self.stdout.write(f"  ✅ Created mapping for {names[0]} (ID: {inspector_id})")
            
            self.stdout.write(f"\nFixed {fixed_users} user mappings and {fixed_data} data mappings")
        
        # Final status
        if not conflicts and not users_without_mappings and not missing_mappings:
            self.stdout.write(self.style.SUCCESS("✅ All inspector mappings are valid!"))
        elif options['auto_fix']:
            self.stdout.write(self.style.SUCCESS("✅ Auto-fix completed!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  Issues found. Run with --auto-fix to fix them automatically."))
        
        # No return value needed
