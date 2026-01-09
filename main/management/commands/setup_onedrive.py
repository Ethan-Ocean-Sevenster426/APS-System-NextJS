"""
Django management command to setup OneDrive authentication
Generates auth URL that user clicks once to permanently authenticate
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import urllib.parse


class Command(BaseCommand):
    help = 'Setup OneDrive authentication - generates auth URL for one-time login'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=' * 80)
        )
        self.stdout.write(
            self.style.SUCCESS('OneDrive Authentication Setup')
        )
        self.stdout.write(
            self.style.SUCCESS('=' * 80)
        )

        # Get credentials from settings
        client_id = settings.ONEDRIVE_CLIENT_ID
        redirect_uri = settings.ONEDRIVE_REDIRECT_URI

        if not client_id:
            self.stdout.write(
                self.style.ERROR('ERROR: ONEDRIVE_CLIENT_ID not configured in settings')
            )
            return

        self.stdout.write(f'\nClient ID: {client_id}')
        self.stdout.write(f'Redirect URI: {redirect_uri}')

        # Generate authorization URL
        scopes = [
            'https://graph.microsoft.com/Files.ReadWrite.All',
            'offline_access'
        ]

        auth_url = (
            f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
            f"client_id={client_id}&"
            f"response_type=code&"
            f"redirect_uri={urllib.parse.quote(redirect_uri, safe='')}&"
            f"scope={urllib.parse.quote(' '.join(scopes), safe='')}&"
            f"response_mode=query"
        )

        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(
            self.style.WARNING('CLICK THIS URL TO AUTHENTICATE ONEDRIVE:')
        )
        self.stdout.write('=' * 80)
        self.stdout.write(f'\n{auth_url}\n')

        self.stdout.write('=' * 80)
        self.stdout.write(
            self.style.SUCCESS('INSTRUCTIONS:')
        )
        self.stdout.write('=' * 80)
        self.stdout.write('1. Copy the URL above')
        self.stdout.write('2. Open it in your web browser')
        self.stdout.write('3. Sign in with your Microsoft account')
        self.stdout.write('4. Grant permissions when asked')
        self.stdout.write('5. After successful auth, tokens will be saved automatically')
        self.stdout.write('6. OneDrive will stay connected permanently (tokens auto-refresh)')
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(
            self.style.SUCCESS('After authentication, you will NEVER need to do this again!')
        )
        self.stdout.write(
            self.style.SUCCESS('The refresh token will keep OneDrive connected forever.')
        )
        self.stdout.write('=' * 80 + '\n')
