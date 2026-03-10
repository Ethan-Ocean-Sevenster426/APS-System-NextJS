from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Delete user accounts with role=admin'

    def handle(self, *args, **options):
        User = get_user_model()
        admin_users = User.objects.filter(role='admin')
        count = admin_users.count()
        if count == 0:
            self.stdout.write(self.style.WARNING('No users with role=admin found.'))
            return
        for u in admin_users:
            self.stdout.write(f'Deleting user: {u.username} (id={u.id}, role={u.role})')
        admin_users.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} user(s) with role=admin.'))
