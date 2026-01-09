#!/usr/bin/env python
"""Create a developer user for the v4 Worksheet demo"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth.models import User

def create_dev_user():
    username = 'admin'
    email = 'admin@moc-pty.com'
    password = 'admin123'  # Change this!

    # Check if user exists
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(f"User '{username}' already exists, updating...")
    else:
        user = User.objects.create_user(username=username, email=email, password=password)
        print(f"Created user '{username}'")

    # Set permissions
    user.is_staff = True
    user.is_superuser = True
    user.save()

    print(f"\nDeveloper user created/updated:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"  Superuser: True")
    print(f"\nLogin at: https://v4-project.moc-pty.com/login")

if __name__ == '__main__':
    create_dev_user()
