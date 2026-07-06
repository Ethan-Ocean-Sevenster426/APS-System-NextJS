# Running with Docker (production)

The stack is three containers wired together by `docker-compose.yml`:

| Service    | Image / build        | Port (host)         | Role                                   |
|------------|----------------------|---------------------|----------------------------------------|
| `db`       | `postgres:17`        | — (internal only)   | Database, data on the `pgdata` volume  |
| `backend`  | `./Dockerfile`       | `8001` → `8000`     | Django API + admin (gunicorn)          |
| `frontend` | `./frontend/Dockerfile` | `3000` → `3000`  | Next.js UI, proxies `/api/*` to backend |

## First run

```bash
# 1. Configure secrets
cp .env.docker.example .env
#    then edit .env — set SECRET_KEY, ALLOWED_HOSTS (include your domain),
#    and the GRAPH_* email credentials.

# 2. Build and start
docker compose up -d --build
```

On first boot the backend automatically:
- waits for Postgres,
- runs `migrate`,
- seeds the standard fee rates (`seed_default_fees`) so revenue figures aren't zero.

Open the app at **http://localhost:3000** (or your server's domain).

## Create the first admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

## Everyday commands

```bash
docker compose logs -f backend      # tail backend logs
docker compose logs -f frontend     # tail frontend logs
docker compose restart backend      # restart one service
docker compose down                 # stop (keeps volumes/data)
docker compose up -d --build        # rebuild after code changes
docker compose exec backend python manage.py <cmd>   # any manage.py command
```

## Notes

- **Data & uploads persist** in the `pgdata` and `media` Docker volumes across
  restarts. `docker compose down -v` would delete them — don't use `-v` unless
  you intend to wipe the database.
- **Secrets** live only in `.env` (git-ignored) and are injected at runtime —
  they are never baked into the images.
- `ALLOWED_HOSTS` **must include `backend`** (the frontend proxies to the backend
  by that service name) plus your public domain.
- Static files are served by WhiteNoise (collected at image build); uploaded
  media is served by Django via `/api/serve-file` off the `media` volume.
