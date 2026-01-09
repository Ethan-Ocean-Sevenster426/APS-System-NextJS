from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

class Command(BaseCommand):
    help = 'Rename a user'

    def add_arguments(self, parser):
        parser.add_argument('--old-username', type=str, help='Current username')
        parser.add_argument('--new-username', type=str, help='New username')

    def handle(self, *args, **options):
        old_username = options['old_username']
        new_username = options['new_username']
        
        if not old_username or not new_username:
            self.stdout.write(
                self.style.ERROR('Both old-username and new-username are required')
            )
            return
        
        try:
            with transaction.atomic():
                # Find the user
                user = User.objects.get(username=old_username)
                
                # Check if new username already exists
                if User.objects.filter(username=new_username).exists():
                    self.stdout.write(
                        self.style.ERROR(f'Username "{new_username}" already exists')
                    )
                    return
                
                # Update the username
                old_username = user.username
                user.username = new_username
                user.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully renamed user from "{old_username}" to "{new_username}" ({user.get_full_name()})'
                    )
                )
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with username "{old_username}" not found')
            )
