#!/usr/bin/env python
"""
Test internal_account_code generation matching Excel formula
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from main.models import Client, FoodSafetyAgencyInspection
from main.views.core_views import generate_unique_internal_account_code

def test_account_code_generation():
    print("\n" + "="*80)
    print("INTERNAL ACCOUNT CODE GENERATION TEST")
    print("="*80)
    print("\nTesting Excel formula implementation:")
    print("=UPPER(LEFT(B,2)) & \"-\" & IF(C=\"Corporate Store\",\"COR\",\"FRN\",\"IND\")")
    print("  & \"-\" & IF(D=\"PMP\",\"PMP\",\"RAW\",\"EGG\",\"PLT\",\"OTH\")")
    print("  & \"-\" & IF(F=\"None\",\"NA\",LOOKUP) & \"-\" & TEXT(ID,\"0000\")")

    print("\n" + "-"*80)
    print("TEST 1: Farm + Individual + EGGS + None → FA-IND-EGG-NA-####")
    print("-"*80)

    # Get a client or create test client
    test_client = Client.objects.filter(id=36).first()
    if not test_client:
        print("Creating test client with ID 36...")
        test_client = Client.objects.create(
            id=36,
            name='Test Farm Client',
            facility_type='Farm',
            group_type='Individual / Independent',
            corporate_group='Not Applicable (None)'
        )

    code1 = generate_unique_internal_account_code(
        client_name='Test Farm Client',
        date_of_inspection='2026-01-25',
        facility_type='Farm',
        group_type='Individual / Independent',
        commodity='EGGS',
        corporate_group='Not Applicable (None)',
        client_id=36
    )

    print(f"\nGenerated: {code1}")
    print(f"Expected:  FA-IND-EGG-NA-0036")

    assert code1 == 'FA-IND-EGG-NA-0036', f"❌ Test 1 failed: {code1} != FA-IND-EGG-NA-0036"
    print("✓ Test 1 PASSED")

    print("\n" + "-"*80)
    print("TEST 2: Retailer + Individual + RAW + None → RE-IND-RAW-NA-####")
    print("-"*80)

    code2 = generate_unique_internal_account_code(
        client_name='Test Retailer',
        date_of_inspection='2026-01-25',
        facility_type='Retailer',
        group_type='Individual / Independent',
        commodity='RAW',
        corporate_group='Not Applicable (None)',
        client_id=8
    )

    print(f"\nGenerated: {code2}")
    print(f"Expected:  RE-IND-RAW-NA-0008")

    assert code2 == 'RE-IND-RAW-NA-0008', f"❌ Test 2 failed: {code2} != RE-IND-RAW-NA-0008"
    print("✓ Test 2 PASSED")

    print("\n" + "-"*80)
    print("TEST 3: Farm + Corporate Store + RAW + Spar → FA-COR-RAW-SPA-####")
    print("-"*80)

    code3 = generate_unique_internal_account_code(
        client_name='Spar Store',
        date_of_inspection='2026-01-25',
        facility_type='Farm',
        group_type='Corporate Store',
        commodity='RAW',
        corporate_group='Spar',
        client_id=26
    )

    print(f"\nGenerated: {code3}")
    print(f"Expected:  FA-COR-RAW-SPA-0026")

    assert code3 == 'FA-COR-RAW-SPA-0026', f"❌ Test 3 failed: {code3} != FA-COR-RAW-SPA-0026"
    print("✓ Test 3 PASSED")

    print("\n" + "-"*80)
    print("TEST 4: Farm + Franchise + POULTRY → FA-FRN-PLT-NA-####")
    print("-"*80)

    code4 = generate_unique_internal_account_code(
        client_name='Franchise Chicken',
        date_of_inspection='2026-01-25',
        facility_type='Farm',
        group_type='Franchise',
        commodity='POULTRY',
        corporate_group='None',
        client_id=60
    )

    print(f"\nGenerated: {code4}")
    print(f"Expected:  FA-FRN-PLT-NA-0060")

    assert code4 == 'FA-FRN-PLT-NA-0060', f"❌ Test 4 failed: {code4} != FA-FRN-PLT-NA-0060"
    print("✓ Test 4 PASSED")

    print("\n" + "-"*80)
    print("TEST 5: Same client, same day, different commodities → Different codes")
    print("-"*80)

    shoprite_client = Client.objects.filter(name__icontains='Shoprite').first()
    if shoprite_client:
        print(f"\nShoprite client found: ID {shoprite_client.id}")

        code5a = generate_unique_internal_account_code(
            client_name='Shoprite',
            date_of_inspection='2026-01-25',
            facility_type='Retailer',
            group_type='Corporate Store',
            commodity='POULTRY',
            corporate_group='Shoprite',
            client_id=shoprite_client.id
        )

        code5b = generate_unique_internal_account_code(
            client_name='Shoprite',
            date_of_inspection='2026-01-25',
            facility_type='Retailer',
            group_type='Corporate Store',
            commodity='RAW',
            corporate_group='Shoprite',
            client_id=shoprite_client.id
        )

        print(f"\nPOULTRY inspection: {code5a}")
        print(f"RAW inspection:     {code5b}")

        # They should be different because commodity is different
        assert code5a != code5b, f"❌ Test 5 failed: codes should be different"
        print("✓ Test 5 PASSED - Different commodities get different codes")
    else:
        print("⚠ Shoprite client not found, skipping test 5")

    print("\n" + "="*80)
    print("✅ ALL TESTS PASSED!")
    print("="*80)
    print("\nCode generation format verified:")
    print("  Part 1: First 2 chars of Facility Type (uppercase)")
    print("  Part 2: Group Type (COR/FRN/IND)")
    print("  Part 3: Commodity (PLT/RAW/EGG/PMP/OCC/OTH)")
    print("  Part 4: Corporate Group code or NA")
    print("  Part 5: Client ID padded to 4 digits")
    print("\nResult: Same client, same day, different commodities = DIFFERENT CODES")
    print("       → Each inspection shows as SEPARATE entry in shipment list ✓")
    print("="*80)

    return True

if __name__ == '__main__':
    try:
        success = test_account_code_generation()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
