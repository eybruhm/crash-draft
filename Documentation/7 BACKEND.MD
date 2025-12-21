# BACKEND (Project Structure Guide)

This doc explains the backend folder structure, and the most important files/classes.

Root backend folder:
- `Backend/`

---

## 1) High-level architecture (layers)

CRASH backend uses a simple layered layout:
- **URLs** (`core/urls.py`) → routes requests to views
- **Views** (`core/views/*`) → handle HTTP requests + auth + response formatting
- **Serializers** (`core/serializers.py`) → validate/translate JSON ↔ Python
- **Models** (`core/models.py`) → DB table mappings (Supabase Postgres)
- **Services** (`core/services.py`) → shared helpers (PDF, geocoding, filters, etc.)

---

## 2) Folder + file map (with descriptions)

### /Backend/
- `/Backend/manage.py` — Django CLI entry point (`runserver`, `migrate`, etc.)
- `/Backend/requirements.txt` — Python dependencies
- `/Backend/.env` — environment variables (not committed)
- `/Backend/hashing.py` — **offline tool**: generate Django password hashes for Supabase insertion

### /Backend/crash_backend/
- `/Backend/crash_backend/settings.py` — settings (DB, CORS, REST config, timezone)
  - **Key settings**:
    - `USE_TZ=True`, `TIME_ZONE='Asia/Manila'`
    - `REST_FRAMEWORK['DATETIME_FORMAT']='iso-8601'`
    - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` from env
- `/Backend/crash_backend/urls.py` — mounts API under `/api/v1/`
- `/Backend/crash_backend/wsgi.py` — WSGI entry point
- `/Backend/crash_backend/asgi.py` — ASGI entry point

### /Backend/core/
- `/Backend/core/models.py` — table models (`tbl_admin`, `tbl_reports`, etc.)
  - `Admin` — admin accounts
  - `PoliceOffice` — police accounts/offices
  - `User` — citizens (mobile)
  - `Report` — incident reports
  - `Message` — report chat messages
  - `Media` — evidence uploads metadata
  - `Checkpoint` — checkpoint entries
  - `SummaryAnalytics` — analytics cache table
- `/Backend/core/serializers.py` — validation + output shapes
  - Initializes Supabase client (`_supabase = create_client(...)`)
  - `PoliceOfficeCreateSerializer` hashes passwords
  - `AdminManualReportCreateSerializer` validates manual report payload
- `/Backend/core/services.py` — reusable helpers
  - `generate_directions_and_qr(...)` — Google Maps directions URL + QR
  - `reverse_geocode(...)` / `reverse_geocode_address(...)` — lat/lng → city/barangay/address
  - `parse_filters(...)` / `apply_common_filters(...)` — analytics/resolved filters
  - `render_pdf(...)` — HTML template → PDF via WeasyPrint
- `/Backend/core/urls.py` — API routing (routers + explicit endpoints)
- `/Backend/core/tests.py` — test placeholder (minimal)

### /Backend/core/views/
This is split into modules:
- `/Backend/core/views/__init__.py` — main viewsets + admin endpoints
- `/Backend/core/views/analytics.py` — analytics endpoints + PDF export
- `/Backend/core/views/reports.py` — resolved cases endpoints + PDF export
- `/Backend/core/views/mobile.py` — citizen/mobile endpoint for report + optional media

---

## 3) Key view classes (what they do)

All main API routes are wired in `Backend/core/urls.py`.

### Auth
- `validate_jwt_token(request)` — manual JWT validation helper
- `LoginAPIView` — `POST /auth/login/` (admin or police login)

### Admin tools
- `PoliceOfficeAdminViewSet` — `GET/POST/PATCH/DELETE /admin/police-offices/`
- `AdminMapAPIView` — `GET /admin/map/data/` (reports + offices + checkpoints)
- `AdminManualReportCreateAPIView` — `POST /admin/reports/manual/`
- `AdminPasswordHashAPIView` — `POST /admin/password-hash/` (requires admin auth)
- `AdminProfileAPIView` — `GET/PATCH /admin/profile/`
- `AdminPasswordChangeAPIView` — `PATCH /admin/profile/password/`
- `AdminUserSearchAPIView` — `GET /admin/users/search/`

### Reports + chat
- `ReportViewSet` — `/reports/` and `/reports/{id}/`
  - `.route` action: `GET /reports/{id}/route/`
  - `.summary_resolved` action: `GET /reports/summary_resolved/`
- `MessageViewSet` — nested resource
  - `GET/POST /reports/{report_id}/messages/`

### Checkpoints + media
- `CheckpointViewSet` — `/checkpoints/` and `/checkpoints/active/`
- `MediaViewSet` — `/media/` (multipart upload) + filters by `report_id`

### Analytics
In `Backend/core/views/analytics.py`:
- `AnalyticsOverviewSummaryAPIView` — `GET /analytics/summary/overview/`
- `LocationHotspotsAPIView` — `GET /analytics/hotspots/locations/`
- `CategoryConcentrationAPIView` — `GET /analytics/hotspots/categories/`
- `AnalyticsExportAPIView` — `GET /analytics/export/` (PDF)

### Resolved cases
In `Backend/core/views/reports.py`:
- `ResolvedCasesAPIView` — `GET /reports/resolved/`
- `ResolvedCasesExportAPIView` — `GET /reports/resolved/export/` (PDF)
- `SingleReportExportAPIView` — `GET /reports/{id}/export/` (PDF)

### Mobile
In `Backend/core/views/mobile.py`:
- `MobileCreateReportWithMediaAPIView` — `POST /mobile/reports/`

---

## 4) Timezone behavior (important)

Backend settings:
- `USE_TZ=True`
- `TIME_ZONE='Asia/Manila'`
- API outputs ISO-8601 with timezone info (`DATETIME_FORMAT='iso-8601'`).

Best practice is:
- DB columns are `TIMESTAMPTZ` (see `SUPABASE.MD`).

