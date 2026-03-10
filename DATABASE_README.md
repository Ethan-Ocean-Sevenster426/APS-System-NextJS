# Database Configurations

All databases use **PostgreSQL** (not MySQL). To switch, replace the `DATABASES` block in `mysite/settings.py`.

---

## 1. Production (master branch)
- **Server:** 167.88.43.168
- **SSH:** `ssh root@167.88.43.168`
- **Database:** v4_inspection
- **Engine:** PostgreSQL (port 5432)
- **User:** v4_user / inspection_user
- **Inspections:** ~2,285 (as of March 2026)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'v4_inspection',
        'USER': 'inspection_user',
        'PASSWORD': 'InspectionTest2026',
        'HOST': '167.88.43.168',
        'PORT': '5432',
    },
}
```

**Server commands:**
```bash
sudo -u postgres psql -d v4_inspection -c "\dt"
sudo -u postgres psql -d v4_inspection -c "SELECT COUNT(*) FROM food_safety_agency_inspections;"
```

---

## 2. Dev (dev branch)
- **Server:** 82.25.97.159
- **Database:** inspection_system
- **Engine:** PostgreSQL (port 5432)
- **User:** inspection_user
- **Password:** InspectionTest2026
- **Inspections:** ~880 (as of March 2026)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'inspection_system',
        'USER': 'inspection_user',
        'PASSWORD': 'InspectionTest2026',
        'HOST': '82.25.97.159',
        'PORT': '5432',
    },
}
```

---

## 3. Local SQLite (offline/testing)
- **File:** db_local.sqlite3

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db_local.sqlite3',
    },
}
```

---

## Key Tables
| Table | Description |
|---|---|
| food_safety_agency_inspections | Individual inspections |
| inspection_groups | Grouped inspections per visit |
| inspections | Legacy table (unused) |
| food_safety_agency_clients | Client records |
| food_safety_agency_client_emails | Additional client emails |
| auth_user | User accounts |

## Notes
- Production server also has a `turnover_data` database (owned by powerbi) — separate from the inspection system.
- Both production and dev are PostgreSQL. There is NO MySQL in use.
