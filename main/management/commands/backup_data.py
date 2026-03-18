"""
Management command: backup_data

Usage:
  python manage.py backup_data           # both DB + Excel
  python manage.py backup_data --db      # PostgreSQL dump only
  python manage.py backup_data --excel   # Excel export only
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Back up the PostgreSQL database and/or export data to Excel'

    def add_arguments(self, parser):
        parser.add_argument('--db', action='store_true', help='PostgreSQL dump only')
        parser.add_argument('--excel', action='store_true', help='Excel export only')

    def handle(self, *args, **options):
        from main.services.scheduled_backup_service import (
            _ensure_dirs, _pg_dump, _excel_export, _cleanup,
            DB_BACKUP_DIR, EXCEL_BACKUP_DIR, KEEP_LAST,
        )
        from datetime import datetime

        _ensure_dirs()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        do_db = options['db'] or not options['excel']
        do_excel = options['excel'] or not options['db']

        if do_db:
            self.stdout.write('Running PostgreSQL backup...')
            ok, msg = _pg_dump(timestamp)
            if ok:
                self.stdout.write(self.style.SUCCESS(f'  ✓ {msg}'))
                _cleanup(DB_BACKUP_DIR, '*.dump', KEEP_LAST)
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ {msg}'))

        if do_excel:
            self.stdout.write('Running Excel export...')
            ok, msg = _excel_export(timestamp)
            if ok:
                self.stdout.write(self.style.SUCCESS(f'  ✓ {msg}'))
                _cleanup(EXCEL_BACKUP_DIR, '*.xlsx', KEEP_LAST)
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ {msg}'))
