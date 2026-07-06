# Agricultural Production System (APS)

**Food Safety Agency (Pty) Ltd — Inspection Management Platform**

This document is a complete reference for the APS system: what it does, how it's
built, how the data is structured, and how it's deployed and operated.

---

## 1. Overview

The Agricultural Production System (APS) is the Food Safety Agency's platform for
managing food-safety **inspections** end to end — from an inspector capturing a
visit, through lab sampling, document generation (RFIs, invoices, COAs), client
communication, and management reporting (KPIs, analytics, financials).

It replaces manual/spreadsheet workflows with a single web application used by
inspectors, lab technicians, managers, financial staff, and administrators.

---

## 2. Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 16 (React 19, TypeScript) | Server-rendered UI + API proxy routes |
| **Backend** | Django 6 (Python 3.13) + Gunicorn | REST-style JSON API, admin, business logic |
| **Database** | PostgreSQL 17 | All application data |
| **Static/media** | WhiteNoise (static) + Django file serving (media) | Uploaded documents on disk/volume |
| **Email** | Microsoft Graph API | Sends inspection documents & report emails |

### Request flow
```
Browser ──HTTPS──> nginx ──> Next.js (frontend) ──/api/*──> Django (backend) ──> PostgreSQL
```
The **frontend proxies `/api/*` to the backend** server-side (via the
`DJANGO_API_URL` environment variable). The browser only ever talks to the
frontend origin; the frontend forwards API calls (with cookies + CSRF token) to
Django. This keeps the backend off the public internet while still allowing a
clean single-origin app.

---

## 3. Roles & Permissions

Access to pages and actions is gated by a `role` field on each user. Roles:

| Role | Sees / can do |
|------|---------------|
| **inspector** | Own inspections, capture visits, upload documents (cannot delete) |
| **inspector_manager** | All inspections (like an inspector with wider visibility) |
| **lab_technician** | Inspections + Lab Analytics; can flag missing samples |
| **admin** | Inspections, clients, admin analytics, export sheet, settings |
| **financial** | Inspections, clients, export sheet (billing focus) |
| **super_admin** | Everything, including user management, system logs, server view |
| **developer** | Everything (build/maintenance access) |

The sidebar navigation is filtered per role (`ROLE_ALLOWED` in the frontend), and
backend endpoints enforce roles via a `@role_required` decorator.

**Document deletion:** inspectors can **upload** documents but can **no longer
delete** any files or inspections — deletion is restricted to managers/admins,
enforced both in the UI and server-side.

---

## 4. Core Features

### Inspection Records (`/inspections`)
The heart of the system. Inspections are grouped into **visits**
(`InspectionGroup`) — one visit to a client on a date can contain multiple
individual product inspections (`FoodSafetyAgencyInspection`), one per
commodity/product. The list shows per-visit status: files (RFI, invoice, COA,
compliance), approval state, sent status, and email.

- **Add Inspection** — a wizard: basic info → products → invoice/travel → review.
  Required fields are enforced; an **RFI document is mandatory for RAW & PMP**
  commodities before the visit can be submitted.
- **Occurrence Reports** — a separate lightweight visit type for incidents.
- **Duplicate detection** — flags visits with the same client + date + inspector
  and an identical product signature.

### RFI (Request For Information) documents
RFIs are `InspectionDocument` records (`document_type='rfi'`) attached at the
visit level. They are **required for RAW and PMP** commodities. The system
surfaces visits missing an RFI (in the list and in the KPI report). Inspectors
can upload/replace an RFI but cannot delete it.

### Client Allocation (`/clients`)
Manages clients (facilities), their metadata (town, corporate group, facility
type), and which commodities/inspectors are allocated to them.

### Inspector Analytics (`/analytics`)
Multi-tab dashboard (Overview, Inspectors, Compliance, Operations, Timelines,
Financial):
- **Operations** — travel distance & hours per inspector and over time (computed
  per *visit* to avoid double-counting).
- **Timelines** — average days from inspection to document send, invoice, COA,
  and approval (count-weighted, shown as whole days).
- **Financial** — revenue per inspector (hours × rate + km × rate + samples),
  costs, and profit, using configurable fee rates.
- **Inspector Performance Ranking** — ranks inspectors by their own output
  (inspections / samples).

### Lab Analytics (`/lab-analytics`)
Sample testing overview for lab staff, including the ability to **flag missing
samples** — where the lab received a sample but the inspector didn't record the
correct sampling information. These flags feed the KPI report.

### Export Sheet (`/export-sheet`)
An invoice line-item dashboard: every billable item (inspection hours, travel km,
sample taking, samples bought) with rates and totals, exportable to **Excel
(.xlsx)** or **CSV**. Fee rates are managed here (see fees below).

### KPI Report
A branded PDF (emailed to management) comparing each inspector's quarterly output
against targets, plus sections for: late entries, missing RFI, missing travel
details, missing samples (lab-reported), duplicate inspections, and inspectors
with a clean record.

### Notifications (`/notifications`)
In-app notifications (e.g. "KPI report sent") for management roles, with
read/mark-all-read/delete actions.

### Management tools
- **User Management** (`/user-management`) — create/manage users & roles.
- **System Logs** (`/system-logs`) — audit trail of actions.
- **Server View** (`/server-view`) — system/health overview.

---

## 5. Key Data Models

| Model | Purpose |
|-------|---------|
| `InspectionGroup` | A visit (client + date + inspector); holds travel (km, hours, times) |
| `FoodSafetyAgencyInspection` | One product/commodity inspection within a visit |
| `InspectionDocument` | Uploaded document (rfi, invoice, coa, compliance, lab, …) |
| `Client` | A facility being inspected |
| `InspectionFee` / `FeeHistory` | Billing rates (hourly, per-km, lab tests) + history |
| `SampleDiscrepancy` | Lab-reported "inspector didn't record the sample" flag |
| `QuarterlyTarget` | Per-inspector quarterly KPI targets |
| `Notification` | In-app notification records |
| `User` | Accounts with a `role`; sent/approved actions also stored as name text |

**Historical names:** actions like "sent by" store both a user link *and* a plain
name string (e.g. `sent_by_name`), so records keep showing who did something even
if that user account is later deleted.

---

## 6. Deployment (Docker)

The system runs as three containers, defined in `docker-compose.yml`:

| Service | Image | Role |
|---------|-------|------|
| `db` | `postgres:17` | Database (data on the `pgdata` volume) |
| `backend` | `./Dockerfile` | Django + Gunicorn (migrations, API, admin) |
| `frontend` | `./frontend/Dockerfile` | Next.js UI, proxies `/api/*` to backend |

- **Uploaded documents** (`media/`) are **bind-mounted** into the backend so the
  container serves existing files in place (no copy needed).
- On start the backend automatically waits for the DB, runs **migrations**, and
  **seeds default fee rates** (idempotent) so revenue figures are never zero on a
  fresh database.
- Static files are collected into the image and served by WhiteNoise; nginx also
  serves `/static/` and `/media/` directly from disk.

### First run
```bash
cp .env.docker.example .env      # set SECRET_KEY, ALLOWED_HOSTS, GRAPH_* creds
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```
The app serves on the configured `FRONTEND_PORT` (default 3000) and
`BACKEND_PORT` (default 8001); in production nginx proxies the domain to the
frontend port. See `DOCKER.md` for full details.

### Environment (`.env`)
`SECRET_KEY`, `ALLOWED_HOSTS` (must include `backend` for the internal proxy plus
your domain), `DB_NAME`/`DB_USER`/`DB_PASSWORD`, and `GRAPH_CLIENT_ID/SECRET/
TENANT_ID` for email.

---

## 7. Common Operations

**Create / update an admin user (with role):**
```bash
docker compose exec backend python manage.py shell -c "from django.contrib.auth import get_user_model as g; U=g(); u,_=U.objects.get_or_create(username='admin'); u.is_superuser=True; u.is_staff=True; u.role='super_admin'; u.set_password('CHANGE_ME'); u.save()"
```

**Restore a database dump into the container:**
```bash
docker compose stop backend
docker compose exec -T db psql -U <user> -d postgres -c "DROP DATABASE IF EXISTS <db>;"
docker compose exec -T db psql -U <user> -d postgres -c "CREATE DATABASE <db> OWNER <user>;"
pg_dump --no-owner --no-privileges <source_db> | docker compose exec -T db psql -U <user> -d <db>
docker compose start backend
```

**Rebuild after a code change:**
```bash
git pull
docker compose up -d --build
docker builder prune -af      # reclaim build cache afterwards
```

**Seed / reset fee rates:**
```bash
docker compose exec backend python manage.py seed_default_fees
```

---

## 8. Notes & Conventions

- **Fees drive revenue.** If the `InspectionFee` table is empty, all revenue is
  zero — `seed_default_fees` populates the standard rates (inspection hour,
  travel per-km, lab tests, etc.).
- **RFI is required for RAW/PMP.** Missing RFIs are reported, not silently
  allowed.
- **Deletion is restricted.** Inspectors upload but never delete documents or
  inspections.
- **Calculations are per-visit where appropriate** (travel, etc.) to avoid
  double-counting across multi-product visits.

---

*Document maintained alongside the codebase. Update it when features, models, or
deployment steps change.*
