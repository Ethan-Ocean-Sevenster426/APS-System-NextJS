#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from django.contrib.auth.models import User

print("=" * 80)
print("SEARCHING FOR GLADYS AND PERCY")
print("=" * 80)

# Search for gladys and percy
search_terms = ['gladys', 'gladis', 'percy']
found_users = []

for term in search_terms:
    users = User.objects.filter(
        username__icontains=term
    ) | User.objects.filter(
        first_name__icontains=term
    ) | User.objects.filter(
        last_name__icontains=term
    ) | User.objects.filter(
        email__icontains=term
    )

    found_users.extend(users)

# Remove duplicates
found_users = list(set(found_users))

if found_users:
    for user in found_users:
        print(f"\nUsername: {user.username}")
        print(f"Email: {user.email}")
        print(f"First Name: {user.first_name}")
        print(f"Last Name: {user.last_name}")
        print(f"Role: {getattr(user, 'role', 'N/A')}")
        print(f"Is Staff: {user.is_staff}")
        print(f"Is Superuser: {user.is_superuser}")
        print(f"Is Active: {user.is_active}")
        print("-" * 40)
else:
    print("\nNo users found matching 'gladys', 'gladis', or 'percy'")

print("\n" + "=" * 80)
print("ALL INSPECTORS")
print("=" * 80)

inspectors = User.objects.filter(role='inspector')
if inspectors:
    for inspector in inspectors:
        print(f"\nUsername: {inspector.username}")
        print(f"Email: {inspector.email}")
        print(f"First Name: {inspector.first_name}")
        print(f"Last Name: {inspector.last_name}")
        print(f"Role: {inspector.role}")
        print("-" * 40)
else:
    print("\nNo inspectors found")

print("\n" + "=" * 80)
print("ALL USERS IN DATABASE")
print("=" * 80)

all_users = User.objects.all()
for user in all_users:
    print(f"\nUsername: {user.username}")
    print(f"Email: {user.email}")
    print(f"Full Name: {user.first_name} {user.last_name}")
    print(f"Role: {getattr(user, 'role', 'N/A')}")
    print("-" * 40)
