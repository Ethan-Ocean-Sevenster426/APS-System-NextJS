from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from main.models import InspectorMapping, FoodSafetyAgencyInspection


@receiver(post_save, sender=User)
def create_inspector_mapping(sender, instance, created, **kwargs):
    """Automatically create inspector mapping when a new inspector user is created"""
    if created and instance.role == 'inspector':
        full_name = instance.get_full_name() or instance.username
        
        # Try to find this inspector in the actual inspection data
        matching_inspector = FoodSafetyAgencyInspection.objects.filter(
            inspector_name=full_name
        ).first()
        
        if matching_inspector:
            # Create mapping with correct ID from data
            InspectorMapping.objects.get_or_create(
                inspector_id=matching_inspector.inspector_id,
                defaults={
                    'inspector_name': full_name,
                    'is_active': True
                }
            )
        else:
            # Create mapping with dummy ID (will need manual correction)
            InspectorMapping.objects.get_or_create(
                inspector_name=full_name,
                defaults={
                    'inspector_id': 9000 + instance.id,  # Use user ID to make it unique
                    'is_active': True
                }
            )
