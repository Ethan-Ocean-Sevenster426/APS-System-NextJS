from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from main.models import InspectorMapping, FoodSafetyAgencyInspection, InspectionGroup

# ---------------------------------------------------------------------------
# Inspection audit helpers
# ---------------------------------------------------------------------------

_INSPECTION_FIELDS = [
    ('commodity',                               'Commodity'),
    ('date_of_inspection',                      'Date of Inspection'),
    ('inspector_name',                          'Inspector'),
    ('is_product_compliant',                    'Product Compliant'),
    ('product_name',                            'Product Name'),
    ('product_class',                           'Product Class'),
    ('is_sample_taken',                         'Sample Taken'),
    ('bought_sample',                           'Sample Amount (R)'),
    ('km_traveled',                             'KM Traveled'),
    ('hours',                                   'Hours'),
    ('additional_email',                        'Additional Email'),
    ('approved_status',                         'Approved Status'),
    ('comment',                                 'Comment'),
    ('lab',                                     'Lab'),
    ('client_name',                             'Client Name'),
    ('town',                                    'Town'),
    ('inspected',                               'Inspected'),
    ('follow_up',                               'Follow Up'),
    ('occurrence_report',                       'Occurrence Report'),
    ('dispensation_application',                'Dispensation Application'),
    ('is_direction_present_for_this_inspection','Direction Present'),
    ('fat',                                     'Fat Test'),
    ('protein',                                 'Protein Test'),
    ('calcium',                                 'Calcium Test'),
    ('dna',                                     'DNA Test'),
]

_GROUP_FIELDS = [
    ('client_name',       'Client Name'),
    ('date_of_inspection','Date of Inspection'),
    ('inspector_name',    'Inspector'),
    ('town',              'Town'),
    ('facility_type',     'Facility Type'),
    ('group_type',        'Group Type'),
    ('corporate_group',   'Corporate Group'),
    ('additional_email',  'Additional Email'),
    ('comment',           'Comment'),
    ('km_traveled',       'KM Traveled'),
    ('hours',             'Hours'),
]


def _to_str(v):
    """Convert any field value to a JSON-safe string for comparison."""
    if v is None:
        return None
    if hasattr(v, 'isoformat'):
        return v.isoformat()
    return str(v)


def _build_changes(old_obj, new_obj, tracked_fields):
    changes = {}
    for field, label in tracked_fields:
        old_val = _to_str(getattr(old_obj, field, None))
        new_val = _to_str(getattr(new_obj, field, None))
        if old_val != new_val:
            changes[field] = {'label': label, 'old': old_val, 'new': new_val}
    return changes


@receiver(pre_save, sender=FoodSafetyAgencyInspection)
def capture_inspection_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    changes = _build_changes(old, instance, _INSPECTION_FIELDS)
    if not changes:
        return

    from main.models import InspectionEditHistory
    from main.middleware import get_current_user
    user = get_current_user()
    try:
        InspectionEditHistory.objects.create(
            object_type='inspection',
            object_id=instance.pk,
            inspection_group_id=instance.inspection_group_id,
            client_name=instance.client_name or '',
            date_of_inspection=instance.date_of_inspection,
            inspector_name=instance.inspector_name or '',
            edited_by=user if user and getattr(user, 'is_authenticated', False) else None,
            changes=changes,
            change_count=len(changes),
        )
    except Exception:
        pass


@receiver(pre_save, sender=InspectionGroup)
def capture_group_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    changes = _build_changes(old, instance, _GROUP_FIELDS)
    if not changes:
        return

    from main.models import InspectionEditHistory
    from main.middleware import get_current_user
    user = get_current_user()
    try:
        InspectionEditHistory.objects.create(
            object_type='group',
            object_id=instance.pk,
            inspection_group_id=instance.pk,
            client_name=instance.client_name or '',
            date_of_inspection=instance.date_of_inspection,
            inspector_name=instance.inspector_name or '',
            edited_by=user if user and getattr(user, 'is_authenticated', False) else None,
            changes=changes,
            change_count=len(changes),
        )
    except Exception:
        pass


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
