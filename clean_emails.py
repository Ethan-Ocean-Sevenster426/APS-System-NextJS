"""Remove all extra emails from the 8 inspections, keep only ethan.sevnester@eclick.co.za"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()
from main.models import InspectionGroup, FoodSafetyAgencyInspection, Client, ClientEmail

facilities = [
    'TEST FULL FLOW CLIENT',
    'TEST_RFI_VALIDATION_CLIENT',
    'Bluffmeat supply Mandeni',
    'Boxer Superstore Dayizenza',
    'Econo Foods-Langenhoven Park',
    "Edward's Steak and Biltong",
    'Fen Meat',
    "Islam's Meat Co.",
]

target = 'ethan.sevnester@eclick.co.za'

for f in facilities:
    groups = InspectionGroup.objects.filter(client_name__icontains=f)
    for g in groups:
        print(f'\n--- {g.client_name} (group {g.id}) ---')
        
        # 1. Clear FoodSafetyAgencyInspection.additional_email on all children
        children = FoodSafetyAgencyInspection.objects.filter(inspection_group=g)
        for child in children:
            if child.additional_email:
                print(f'  Clearing FSA child additional_email: {child.additional_email}')
                child.additional_email = None
                child.save()
        
        # 2. Fix client email sources
        if g.client:
            # Set primary email
            if g.client.email != target:
                print(f'  Setting client.email: {g.client.email} -> {target}')
                g.client.email = target
            
            # Clear manual_email
            if g.client.manual_email:
                print(f'  Clearing client.manual_email: {g.client.manual_email}')
                g.client.manual_email = None
            
            g.client.save()
            
            # Delete ClientEmail records
            extras = ClientEmail.objects.filter(client=g.client)
            if extras.exists():
                for ce in extras:
                    print(f'  Deleting ClientEmail: {ce.email}')
                extras.delete()
        
        # 3. Clear group additional_email
        if g.additional_email and g.additional_email != target:
            print(f'  Clearing group additional_email: {g.additional_email}')
            g.additional_email = None
            g.save()

    if not groups.exists():
        print(f'\n  NOT FOUND: {f}')

print('\n\nDone - all emails cleaned to only ethan.sevnester@eclick.co.za')
