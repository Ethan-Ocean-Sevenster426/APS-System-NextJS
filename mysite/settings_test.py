"""
Test-only settings — uses a local SQLite database so tests can run
without needing access to the remote PostgreSQL server.
"""
from mysite.settings import *  # noqa: F401, F403
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': _BASE_DIR / 'test_local.sqlite3',
    }
}

# Speed up password hashing in tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]
