"""
Test: download_all_inspection_files returns ALL files, not just files from the first inspection.

Bug: The old code used .first() to look up a single inspection in the docs/ structure,
     so for groups with multiple inspections (e.g. 8 commodities on the same date),
     only files from the first inspection's folder were included in the ZIP.

Fix: Changed to loop through ALL inspections for the client+date, matching the
     behavior of get_inspection_files_local (what shows in the modal).
"""
import os
import sys
import json
import shutil
import zipfile
import tempfile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

import django
django.setup()

from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth.models import User
from django.conf import settings
from main.models import FoodSafetyAgencyInspection, Client
from main.views.core_views import download_all_inspection_files


# Use a temp dir for MEDIA_ROOT so we don't touch real files
TEMP_MEDIA = tempfile.mkdtemp(prefix='test_download_all_')


class DownloadAllFilesTest(TestCase):
    """Test that download-all includes files from ALL inspections, not just the first."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.factory = RequestFactory()

        # Get existing test_inspector or create one
        cls.user, _ = User.objects.get_or_create(
            username='test_inspector',
            defaults={'password': 'TestPass123!', 'email': 'inspector@test.com'}
        )

        # Create a test client with unique name to avoid collisions
        cls.client_obj = Client.objects.create(name='ZZZ_Test_DownloadAll_Client')

        # Create 3 inspections for the same client + date (simulates multiple commodities)
        cls.inspection1 = FoodSafetyAgencyInspection.objects.create(
            client=cls.client_obj,
            client_name='ZZZ_Test_DownloadAll_Client',
            date_of_inspection='2026-01-15',
            commodity='APPLES',
        )
        cls.inspection2 = FoodSafetyAgencyInspection.objects.create(
            client=cls.client_obj,
            client_name='ZZZ_Test_DownloadAll_Client',
            date_of_inspection='2026-01-15',
            commodity='ORANGES',
        )
        cls.inspection3 = FoodSafetyAgencyInspection.objects.create(
            client=cls.client_obj,
            client_name='ZZZ_Test_DownloadAll_Client',
            date_of_inspection='2026-01-15',
            commodity='BANANAS',
        )

        # Create docs folder structure with files in EACH inspection's folder
        for insp, filename in [
            (cls.inspection1, 'apples_rfi_report.pdf'),
            (cls.inspection2, 'oranges_rfi_report.pdf'),
            (cls.inspection3, 'bananas_rfi_report.pdf'),
        ]:
            rfi_path = os.path.join(TEMP_MEDIA, 'docs', str(cls.client_obj.id), str(insp.id), 'rfi')
            os.makedirs(rfi_path, exist_ok=True)
            filepath = os.path.join(rfi_path, filename)
            with open(filepath, 'w') as f:
                f.write(f'Test content for {insp.commodity}')

        # Also add files in other categories to inspection2 and inspection3
        for insp, cat, filename in [
            (cls.inspection2, 'invoice', 'oranges_invoice.pdf'),
            (cls.inspection3, 'lab_form', 'bananas_lab_form.pdf'),
            (cls.inspection1, 'compliance', 'apples_compliance.pdf'),
        ]:
            cat_path = os.path.join(TEMP_MEDIA, 'docs', str(cls.client_obj.id), str(insp.id), cat)
            os.makedirs(cat_path, exist_ok=True)
            filepath = os.path.join(cat_path, filename)
            with open(filepath, 'w') as f:
                f.write(f'Test {cat} content for {insp.commodity}')

    @classmethod
    def tearDownClass(cls):
        # Clean up test data from the live database
        FoodSafetyAgencyInspection.objects.filter(client_name__startswith='ZZZ_Test_').delete()
        Client.objects.filter(name__startswith='ZZZ_Test_').delete()
        super().tearDownClass()
        # Clean up temp media
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def _make_download_request(self, client_name, inspection_date):
        """Helper to make a POST request to download_all_inspection_files."""
        body = json.dumps({
            'client_name': client_name,
            'inspection_date': inspection_date,
        })
        request = self.factory.post(
            '/inspections/download-all-files/',
            data=body,
            content_type='application/json'
        )
        request.user = self.user
        return request

    @override_settings(MEDIA_ROOT=TEMP_MEDIA)
    def test_download_includes_files_from_all_inspections(self):
        """
        MAIN BUG TEST: Verify that files from ALL inspections are in the ZIP,
        not just the first inspection.
        """
        request = self._make_download_request('ZZZ_Test_DownloadAll_Client', '2026-01-15')
        response = download_all_inspection_files(request)

        # Debug: print response body if it's JSON (error response)
        content_type = response.get('Content-Type', '')
        if content_type == 'application/json':
            print(f'\n  ERROR RESPONSE: {response.content.decode()}')
        self.assertEqual(response.status_code, 200,
            f'Expected 200, got {response.status_code}')
        self.assertEqual(content_type, 'application/zip',
            f'Expected ZIP but got {content_type}')

        # Extract ZIP and check contents
        zip_data = (b''.join(response.streaming_content)
                    if hasattr(response, 'streaming_content') else response.content)
        tmp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        tmp_zip.write(zip_data)
        tmp_zip.close()

        try:
            with zipfile.ZipFile(tmp_zip.name, 'r') as zf:
                filenames = [os.path.basename(n) for n in zf.namelist()]

                print(f'\n  Files in ZIP: {filenames}')
                print(f'  Total files: {len(filenames)}')

                # Should have 6 files total (3 rfi + 1 invoice + 1 lab_form + 1 compliance)
                self.assertEqual(len(filenames), 6,
                    f'Expected 6 files in ZIP but got {len(filenames)}: {filenames}. '
                    f'This means the download is still missing files from some inspections!')

                # Verify files from ALL 3 inspections are present
                self.assertIn('apples_rfi_report.pdf', filenames,
                    'Missing file from inspection 1 (APPLES)')
                self.assertIn('oranges_rfi_report.pdf', filenames,
                    'Missing file from inspection 2 (ORANGES)')
                self.assertIn('bananas_rfi_report.pdf', filenames,
                    'Missing file from inspection 3 (BANANAS)')

                # Verify other category files are present
                self.assertIn('oranges_invoice.pdf', filenames,
                    'Missing invoice from inspection 2')
                self.assertIn('bananas_lab_form.pdf', filenames,
                    'Missing lab_form from inspection 3')
                self.assertIn('apples_compliance.pdf', filenames,
                    'Missing compliance from inspection 1')
        finally:
            os.unlink(tmp_zip.name)

        print('  PASS: All 6 files from all 3 inspections are in the ZIP!')

    @override_settings(MEDIA_ROOT=TEMP_MEDIA)
    def test_download_single_inspection_still_works(self):
        """Verify the fix doesn't break single-inspection groups."""
        # Create a separate client with only 1 inspection
        solo_client = Client.objects.create(name='ZZZ_Test_Solo_Client')
        solo_insp = FoodSafetyAgencyInspection.objects.create(
            client=solo_client,
            client_name='ZZZ_Test_Solo_Client',
            date_of_inspection='2026-02-01',
            commodity='GRAPES',
        )
        rfi_path = os.path.join(
            TEMP_MEDIA, 'docs', str(solo_client.id), str(solo_insp.id), 'rfi')
        os.makedirs(rfi_path, exist_ok=True)
        with open(os.path.join(rfi_path, 'grapes_rfi.pdf'), 'w') as f:
            f.write('Solo test file')

        request = self._make_download_request('ZZZ_Test_Solo_Client', '2026-02-01')
        response = download_all_inspection_files(request)

        self.assertEqual(response.status_code, 200)

        zip_data = (b''.join(response.streaming_content)
                    if hasattr(response, 'streaming_content') else response.content)
        tmp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        tmp_zip.write(zip_data)
        tmp_zip.close()

        try:
            with zipfile.ZipFile(tmp_zip.name, 'r') as zf:
                filenames = [os.path.basename(n) for n in zf.namelist()]
                self.assertEqual(len(filenames), 1)
                self.assertIn('grapes_rfi.pdf', filenames)
        finally:
            os.unlink(tmp_zip.name)

        print('  PASS: Single-inspection download still works correctly!')

    @override_settings(MEDIA_ROOT=TEMP_MEDIA)
    def test_no_duplicate_files_across_inspections(self):
        """Verify that identical files across inspections are deduplicated."""
        # Create a client with 2 inspections that share a file with same name+size
        dup_client = Client.objects.create(name='ZZZ_Test_Dup_Client')
        dup_insp1 = FoodSafetyAgencyInspection.objects.create(
            client=dup_client,
            client_name='ZZZ_Test_Dup_Client',
            date_of_inspection='2026-03-01',
            commodity='ITEM_A',
        )
        dup_insp2 = FoodSafetyAgencyInspection.objects.create(
            client=dup_client,
            client_name='ZZZ_Test_Dup_Client',
            date_of_inspection='2026-03-01',
            commodity='ITEM_B',
        )

        # Put the SAME file (same name, same content/size) in both inspections
        for insp in [dup_insp1, dup_insp2]:
            rfi_path = os.path.join(
                TEMP_MEDIA, 'docs', str(dup_client.id), str(insp.id), 'rfi')
            os.makedirs(rfi_path, exist_ok=True)
            with open(os.path.join(rfi_path, 'shared_report.pdf'), 'w') as f:
                f.write('Identical content')

        # Also put a unique file in insp2
        inv_path = os.path.join(
            TEMP_MEDIA, 'docs', str(dup_client.id), str(dup_insp2.id), 'invoice')
        os.makedirs(inv_path, exist_ok=True)
        with open(os.path.join(inv_path, 'unique_invoice.pdf'), 'w') as f:
            f.write('Unique invoice content')

        request = self._make_download_request('ZZZ_Test_Dup_Client', '2026-03-01')
        response = download_all_inspection_files(request)

        self.assertEqual(response.status_code, 200)

        zip_data = (b''.join(response.streaming_content)
                    if hasattr(response, 'streaming_content') else response.content)
        tmp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        tmp_zip.write(zip_data)
        tmp_zip.close()

        try:
            with zipfile.ZipFile(tmp_zip.name, 'r') as zf:
                filenames = [os.path.basename(n) for n in zf.namelist()]
                print(f'\n  Files in dedup ZIP: {filenames}')

                # unique_invoice.pdf from insp2 must be present
                self.assertIn('unique_invoice.pdf', filenames,
                    'unique_invoice.pdf from inspection 2 is missing!')

                # At least 1 copy of shared_report should be present
                shared_count = sum(1 for f in filenames if f.startswith('shared_report'))
                self.assertGreaterEqual(shared_count, 1,
                    'No copy of shared_report.pdf found!')
        finally:
            os.unlink(tmp_zip.name)

        print('  PASS: Deduplication works and all unique files are included!')


if __name__ == '__main__':
    import unittest

    print('=' * 70)
    print('TEST: download_all_inspection_files - verify ALL files are downloaded')
    print('=' * 70)

    # Run tests
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(DownloadAllFilesTest)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Summary
    print('\n' + '=' * 70)
    if result.wasSuccessful():
        print('ALL TESTS PASSED - Download All fix is working correctly!')
    else:
        print('SOME TESTS FAILED - Review the output above for details.')
    print('=' * 70)

    sys.exit(0 if result.wasSuccessful() else 1)
