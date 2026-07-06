#!/usr/bin/env bash
# Backend startup: wait for Postgres, apply migrations, seed default fees, then
# hand off to the container command (gunicorn).
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"

echo "[entrypoint] Waiting for Postgres at ${DB_HOST}:${DB_PORT} ..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; do
  sleep 1
done
echo "[entrypoint] Postgres is up."

echo "[entrypoint] Applying migrations..."
python manage.py migrate --noinput

# Seed the standard fee rates if the table is empty (idempotent) so revenue
# figures are never silently zero on a fresh database.
echo "[entrypoint] Seeding default fees..."
python manage.py seed_default_fees || true

exec "$@"
