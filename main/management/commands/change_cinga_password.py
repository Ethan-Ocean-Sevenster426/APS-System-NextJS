from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction
from django.db import models

class Command(BaseCommand):
    help = 'Change password for user cinga to Banoyolo@08'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='cinga',
            help='Username to change password for (default: cinga)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='Banoyolo@08',
            help='New password (default: Banoyolo@08)'
        )

    def handle(self, *args, **options):
        username = options['username']
        new_password = options['password']
        
        self.stdout.write(
            self.style.WARNING(
                f'Attempting to change password for user: {username}'
            )
        )
        
        try:
            with transaction.atomic():
                # Try to find user by exact username first
                try:
                    user = User.objects.get(username=username)
                except User.DoesNotExist:
                    # Try case-insensitive search
                    user = User.objects.filter(username__iexact=username).first()
                    if not user:
                        # Try searching by first name or last name containing 'cinga'
                        user = User.objects.filter(
                            models.Q(first_name__icontains='cinga') | 
                            models.Q(last_name__icontains='cinga') |
                            models.Q(first_name__icontains='cinga') |
                            models.Q(last_name__icontains='cinga')
                        ).first()
                
                if user:
                    # Change the password
                    user.set_password(new_password)
                    user.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Successfully changed password for user: {user.username}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Full name: {user.get_full_name()}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Email: {user.email}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Role: {getattr(user, "role", "N/A")}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Active: {user.is_active}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f'❌ User "{username}" not found in the system'
                        )
                    )
                    
                    # Show available users for reference
                    self.stdout.write(
                        self.style.WARNING(
                            '\nAvailable users in the system:'
                        )
                    )
                    users = User.objects.all().order_by('username')
                    for u in users:
                        self.stdout.write(f'  • {u.username} ({u.get_full_name()}) - {u.email}')
                        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'❌ Error changing password: {str(e)}'
                )
            )
