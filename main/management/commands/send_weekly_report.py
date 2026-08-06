"""Send the automatic emails (Email Automation page).

Each automation has its own schedule — daily, weekly on a day, or monthly on
a date, at a chosen hour. Run this from cron a few times per hour; each run
sends only the automations that are due this hour and haven't sent yet this
period, so the extra runs act as retries after a failure:

    5 * * * *  python manage.py send_weekly_report
    25 * * * * python manage.py send_weekly_report
    45 * * * * python manage.py send_weekly_report

Every processed automation writes a log row (sent / failed / skipped) that
shows on the Email Automation page. Automations that are not due this hour
are left alone quietly.
"""
from django.core.management.base import BaseCommand

from main.models import EmailAutomation
from main.services.weekly_email_service import send_due_automations, send_automation_email


class Command(BaseCommand):
    help = "Send the email automations that are due this hour (each respects its own switch; every attempt is logged)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-to',
            help='Send a test to this address only (ignores switches and schedules, logs as TEST)',
        )
        parser.add_argument(
            '--automation', type=int,
            help='Automation id for --test-to (default: the first automation)',
        )
        parser.add_argument(
            '--test-inspector',
            help="For individual automations: whose personal report the test shows",
        )
        parser.add_argument(
            '--force', action='store_true',
            help='Process every automation now regardless of schedule or already-sent guard',
        )

    def handle(self, *args, **opts):
        if opts.get('test_to'):
            automation = (
                EmailAutomation.objects.filter(id=opts['automation']).first()
                if opts.get('automation') else EmailAutomation.objects.order_by('id').first()
            )
            if not automation:
                self.stdout.write(self.style.ERROR('No automation found — create one on the Email Automation page first.'))
                return
            logs = [send_automation_email(
                automation, triggered_by='test', test_to=opts['test_to'],
                test_inspector=opts.get('test_inspector'),
            )]
        else:
            logs = send_due_automations(force=opts.get('force', False))
            if not logs:
                self.stdout.write('Nothing due this hour.')
                return

        for log in logs:
            line = f"[{log.automation_name}] {log.status} — week {log.week_start} to {log.week_end}"
            if log.recipients:
                line += f" — to: {log.recipients}"
            if log.error:
                line += f" — {log.error}"
            style = self.style.SUCCESS if log.status in ('SENT', 'TEST') else (
                self.style.ERROR if log.status == 'FAILED' else self.style.WARNING
            )
            self.stdout.write(style(line))
