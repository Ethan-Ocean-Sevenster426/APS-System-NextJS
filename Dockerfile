# ── Django backend (production) ──────────────────────────────────────────────
# Serves the API + admin via gunicorn. Static files are served by WhiteNoise;
# uploaded media lives on a mounted volume (see docker-compose.yml).
FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=mysite.settings

# System libraries:
#  - build-essential/pkg-config/default-libmysqlclient-dev → build mysqlclient
#  - libpq5 → runtime for psycopg2
#  - libjpeg/zlib → Pillow
#  - postgresql-client → pg_isready health wait in the entrypoint
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential pkg-config default-libmysqlclient-dev \
        libpq5 libjpeg62-turbo zlib1g postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Collect static assets for WhiteNoise. A dummy SECRET_KEY keeps the build from
# failing if none is set at build time; the real one is injected at runtime.
RUN SECRET_KEY=build-only DEBUG=False python manage.py collectstatic --noinput || true

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "mysite.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "300"]
