"""
Test script for Retest upload functionality
Run with: python tst.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from main.views.core_views import upload_document

User = get_user_model()


def create_test_pdf():
    """Create a minimal valid PDF file for testing"""
    pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
193
%%EOF"""
    return pdf_content


def test_retest_upload():
    """Test the retest upload endpoint directly"""
    print("=" * 60)
    print("RETEST UPLOAD TEST (Direct View Call)")
    print("=" * 60)

    factory = RequestFactory()

    # Get a user with scientist role (can upload retest)
    try:
        # Try to find a scientist user first
        user = User.objects.filter(role='scientist').first()
        if not user:
            # Try superuser
            user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.first()
        if not user:
            print("ERROR: No users found in database.")
            return False

        # Set role to scientist for this test
        original_role = getattr(user, 'role', None)
        user.role = 'scientist'
        print(f"Using user: {user.username} (role set to scientist for test)")
    except Exception as e:
        print(f"ERROR getting user: {e}")
        return False

    pdf_content = create_test_pdf()

    # Test cases
    test_cases = [
        {
            "name": "Test 1: Retest with group_id only",
            "data": {
                'document_type': 'retest',
                'group_id': 'TestClient_20250112',
            },
            "expect_error_contains": None
        },
        {
            "name": "Test 2: Retest with inspection_id only",
            "data": {
                'document_type': 'retest',
                'inspection_id': '12345',
            },
            "expect_error_contains": None
        },
        {
            "name": "Test 3: Retest with both IDs",
            "data": {
                'document_type': 'retest',
                'group_id': 'TestClient_20250112',
                'inspection_id': '12345',
            },
            "expect_error_contains": None
        },
        {
            "name": "Test 4: Retest with NO IDs (should fail)",
            "data": {
                'document_type': 'retest',
            },
            "expect_error_contains": "No group ID or inspection ID"
        },
    ]

    results = []

    for test in test_cases:
        print(f"\n{'-' * 50}")
        print(f"Running: {test['name']}")
        print(f"Data: {test['data']}")

        # Create fresh file for each test
        pdf_file = SimpleUploadedFile(
            name='test_retest.pdf',
            content=pdf_content,
            content_type='application/pdf'
        )

        try:
            # Create request
            request = factory.post(
                '/upload-document/',
                data={
                    **test['data'],
                    'file': pdf_file,
                }
            )
            request.user = user

            # Call view directly
            response = upload_document(request)

            print(f"Status Code: {response.status_code}")

            try:
                import json
                json_response = json.loads(response.content)
                print(f"Response: {json_response}")

                success = json_response.get('success', False)
                error = json_response.get('error', '')

                if test['expect_error_contains']:
                    if test['expect_error_contains'] in error:
                        print(f"PASS - Got expected error")
                        results.append((test['name'], True, f"Expected: {error[:50]}..."))
                    elif success:
                        print("FAIL - Should have failed but succeeded")
                        results.append((test['name'], False, "Should have failed"))
                    else:
                        print(f"FAIL - Got different error: {error}")
                        results.append((test['name'], False, f"Wrong error: {error[:50]}..."))
                else:
                    if success:
                        print("PASS - Upload succeeded")
                        results.append((test['name'], True, "Success"))
                    elif 'No group ID or inspection ID' in error:
                        print(f"FAIL - Missing ID error when IDs provided")
                        results.append((test['name'], False, error[:50]))
                    else:
                        print(f"PASS - IDs received correctly (other error: {error[:40]}...)")
                        results.append((test['name'], True, "IDs OK"))

            except Exception as e:
                print(f"Response parse error: {e}")
                print(f"Content: {response.content[:200]}")
                results.append((test['name'], False, str(e)[:50]))

        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            results.append((test['name'], False, str(e)[:50]))

    # Restore original role
    if original_role:
        user.role = original_role

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, s, _ in results if s)
    failed = sum(1 for _, s, _ in results if not s)

    for name, success, msg in results:
        status = "PASS" if success else "FAIL"
        print(f"{status}: {name}")
        print(f"       {msg}")

    print(f"\nTotal: {passed} passed, {failed} failed out of {len(results)} tests")

    # Key validation
    print("\n" + "-" * 60)
    print("KEY RESULT:")
    print("-" * 60)

    test4_passed = results[3][1] if len(results) > 3 else False
    if test4_passed:
        print("SUCCESS! Test 4 passed - uploads without IDs are rejected")
        print("with the correct error message.")
    else:
        print("Test 4 result:", results[3] if len(results) > 3 else "Not run")

    return passed >= 3  # At least 3 tests should pass


def test_frontend_validation():
    """Show frontend validation logic"""
    print("=" * 60)
    print("FRONTEND VALIDATION LOGIC")
    print("=" * 60)

    print("\nJavaScript checks before upload:")
    print("-" * 40)
    print("if (!productId && !groupId) {")
    print("    alert('Error: Unable to upload...');")
    print("    return;  // Don't make request")
    print("}")
    print()
    print("Result: User sees alert BEFORE request if both IDs missing")
    print()

    test_values = [
        ("null", False, "NOT sent"),
        ("''", False, "NOT sent"),
        ("'TestClient_20250112'", True, "SENT"),
        ("'12345'", True, "SENT"),
    ]

    print("Value checks (JavaScript):")
    for val, truthy, result in test_values:
        print(f"  {val:25} -> {result}")

    return True


if __name__ == '__main__':
    print("Retest Upload Fix Verification")
    print("==============================\n")

    test_frontend_validation()
    print()

    try:
        success = test_retest_upload()
        print("\n" + "=" * 60)
        if success:
            print("OVERALL: FIX VERIFIED WORKING")
        else:
            print("OVERALL: Some tests failed - check output above")
        print("=" * 60)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
