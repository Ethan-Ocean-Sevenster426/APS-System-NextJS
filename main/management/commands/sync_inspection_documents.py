"""Scan media/docs filesystem and create missing InspectionDocument records.

Fixes the mismatch where COA files exist on disk but the NO_COA filter
(which checks InspectionDocument) doesn't know about them.
"""
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone


FILE_CATEGORIES = {
    'lab', 'coa', 'composition', 'compliance',
    'occurrence', 'retest', 'other', 'lab_form',
    'rfi', 'invoice',
}


class Command(BaseCommand):
    help = 'Create missing InspectionDocument records for files that exist on disk'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show what would be created without writing')

    def handle(self, *args, **options):
        from main.models import FoodSafetyAgencyInspection, InspectionDocument

        dry_run = options['dry_run']
        docs_root = os.path.join(settings.MEDIA_ROOT, 'docs')

        if not os.path.isdir(docs_root):
            self.stdout.write(self.style.WARNING(f'No docs directory at {docs_root}'))
            return

        all_insp_ids = set(
            str(i) for i in FoodSafetyAgencyInspection.objects.values_list('id', flat=True)
        )
        self.stdout.write(f'Found {len(all_insp_ids)} inspections in database')

        existing_docs = set(
            InspectionDocument.objects.values_list('inspection_id', 'document_type')
        )
        self.stdout.write(f'Found {len(existing_docs)} existing InspectionDocument records')

        to_create = []
        scanned = 0

        for client_dir_name in os.listdir(docs_root):
            client_dir = os.path.join(docs_root, client_dir_name)
            if not os.path.isdir(client_dir):
                continue
            for insp_id_str in os.listdir(client_dir):
                if insp_id_str not in all_insp_ids:
                    continue
                insp_dir = os.path.join(client_dir, insp_id_str)
                if not os.path.isdir(insp_dir):
                    continue
                scanned += 1
                insp_id = int(insp_id_str)
                for category in os.listdir(insp_dir):
                    if category not in FILE_CATEGORIES:
                        continue
                    cat_path = os.path.join(insp_dir, category)
                    if not os.path.isdir(cat_path) or not os.listdir(cat_path):
                        continue
                    if (insp_id, category) not in existing_docs:
                        to_create.append(InspectionDocument(
                            inspection_id=insp_id,
                            document_type=category,
                            uploaded_date=timezone.now(),
                        ))

        self.stdout.write(f'Scanned {scanned} inspection directories on disk')
        self.stdout.write(f'Found {len(to_create)} missing InspectionDocument records')

        if to_create:
            by_type = {}
            for doc in to_create:
                by_type[doc.document_type] = by_type.get(doc.document_type, 0) + 1
            for doc_type, count in sorted(by_type.items()):
                self.stdout.write(f'  {doc_type}: {count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run — no records created'))
        elif to_create:
            InspectionDocument.objects.bulk_create(to_create, batch_size=500, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f'Created {len(to_create)} InspectionDocument records'))
        else:
            self.stdout.write(self.style.SUCCESS('All files already have matching records'))
