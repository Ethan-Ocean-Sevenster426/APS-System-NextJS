"""
Django management command to import Xero OAuth2 tokens.
Usage: python manage.py import_xero_tokens
"""
import json
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from main.models import XeroToken


class Command(BaseCommand):
    help = 'Import Xero OAuth2 tokens from xero_tokens.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            default='xero_tokens.json',
            help='Path to the tokens JSON file (default: xero_tokens.json)',
        )

    def handle(self, *args, **options):
        filepath = options['file']

        try:
            with open(filepath) as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f'File not found: {filepath}'))
            return
        except json.JSONDecodeError:
            self.stderr.write(self.style.ERROR(f'Invalid JSON in: {filepath}'))
            return

        access_token = data.get('access_token', '')
        refresh_token = data.get('refresh_token', '')
        expires_in = data.get('expires_in', 1800)
        tenant_id = data.get('tenant_id', '')
        tenant_name = data.get('tenant_name', '')

        if not access_token or not refresh_token:
            self.stderr.write(self.style.ERROR('Missing access_token or refresh_token in file'))
            return

        # Replace any existing tokens
        XeroToken.objects.all().delete()
        token = XeroToken.objects.create(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=timezone.now() + timedelta(seconds=expires_in),
            tenant_id=tenant_id,
            tenant_name=tenant_name,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Xero tokens imported successfully!\n'
            f'  Tenant: {tenant_name}\n'
            f'  Tenant ID: {tenant_id}\n'
            f'  Expires at: {token.expires_at}\n'
            f'  Token will auto-refresh via refresh_token'
        ))
