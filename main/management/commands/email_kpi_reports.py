"""
Management command: send quarterly KPI emails to all active inspectors.

Usage:
    python manage.py send_kpi_emails
    python manage.py send_kpi_emails --dry-run
    python manage.py send_kpi_emails --username john.doe
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Send quarterly KPI update emails to inspector users.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Compute KPI data but do not send any emails.',
        )
        parser.add_argument(
            '--username', type=str, default=None,
            help='Send only to a specific username.',
        )

    def handle(self, *args, **options):
        from main.services.kpi_email_service import send_kpi_email_to_inspector, send_kpi_emails_to_all

        User = get_user_model()
        dry_run = options['dry_run']
        username = options.get('username')

        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'User "{username}" not found.'))
                return
            users = [user]
        else:
            users = list(User.objects.filter(role='inspector', is_active=True))

        if not users:
            self.stdout.write(self.style.WARNING('No inspector users found.'))
            return

        self.stdout.write(f'{"[DRY RUN] " if dry_run else ""}Sending KPI emails to {len(users)} inspector(s)...')

        if dry_run:
            from main.services.kpi_email_service import compute_inspector_kpi
            for user in users:
                name = user.get_full_name() or user.username
                try:
                    data = compute_inspector_kpi(name)
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ {name} <{user.email}> — {data["quarter_label"]} status: {data["overall_status"]}'
                    ))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  ✗ {name}: {e}'))
            return

        sent = 0
        failed = 0
        for user in users:
            success, msg = send_kpi_email_to_inspector(user)
            if success:
                sent += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ {msg}'))
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(f'  ✗ {msg}'))

        self.stdout.write(f'\nDone — {sent} sent, {failed} failed.')
