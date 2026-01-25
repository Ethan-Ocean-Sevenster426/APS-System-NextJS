"""
Local development settings using SQLite database.
Run with: python manage.py runserver --settings=mysite.settings_local
"""

from .settings import *

# Override database to use local SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'test_manual_inspections.sqlite3',
    }
}

# Disable Redis cache for local testing (use simple cache)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Enable debug for local testing
DEBUG = True

print("\n" + "=" * 60)
print("USING LOCAL SQLITE DATABASE FOR TESTING")
print(f"Database: {DATABASES['default']['NAME']}")
print("=" * 60 + "\n")
