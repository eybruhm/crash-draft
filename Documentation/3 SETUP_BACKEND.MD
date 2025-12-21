# SETUP_BACKEND (Django + DRF)

This guide helps you run the CRASH backend locally on Windows (PowerShell).

---

## 0) What you’re setting up

Backend stack:
- Django + Django REST Framework
- PostgreSQL database (Supabase)
- Supabase Storage upload (server-side)
- PDF generation using WeasyPrint (requires GTK runtime on Windows)

Project entry point:
- `Backend/manage.py`

API base URL in development:
- `http://localhost:8000/api/v1/`

---

## 1) Prerequisites

### Required
- Python 3.11+ (recommended)
- Git
- Supabase project (DB + Storage bucket)

### Windows-only (for PDFs)
WeasyPrint needs native libraries. On Windows, you installed:
- `gtk3-runtime-3.24.31-2022-01-04-ts-win64`

Source:
- https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer

Important notes:
- Install GTK **before** testing PDF endpoints.
- After installing, restart PowerShell / your PC if required.

---

## 2) Create a virtual environment (venv)

From the CRASH root:
```powershell
cd c:\ALMM\Programming\CRASH\Backend
python -m venv venv
.\venv\Scripts\activate
```

---

## 3) Install dependencies

Install pinned dependencies from:
- `Backend/requirements.txt`

Commands:
```powershell
cd c:\ALMM\Programming\CRASH\Backend
pip install --upgrade pip
pip install -r requirements.txt
```

### Key packages (what they do)
(You don’t need to memorize these; this is just for understanding.)
- `Django` — web framework
- `djangorestframework` — REST API layer
- `django-cors-headers` — allow frontend apps to call backend
- `djangorestframework_simplejwt` — JWT creation/validation
- `drf-nested-routers` — nested URLs (messages under reports)
- `psycopg2-binary` — PostgreSQL driver
- `python-dotenv` — loads your `.env` into environment variables
- `supabase` + `storage3` + `realtime` — Supabase SDK
- `weasyprint` — HTML → PDF
- `pycairo`, `rlPyCairo`, `pango/cairo deps via GTK` — required by WeasyPrint rendering
- `qrcode` + `pillow` — QR code generation used in PDFs
- `requests` — Google Maps Geocoding API calls

---

## 4) Create the backend `.env`

Create a `.env` file in:
- `Backend/.env`

DO NOT commit your real keys/passwords to GitHub.
Use a template like this:

```env
# Django
SECRET_KEY='<your-django-secret-key>'

# Google Maps
GOOGLE_MAPS_API_KEY='<your-google-maps-api-key>'

# Supabase SDK
SUPABASE_URL='https://<your-project-ref>.supabase.co'
SUPABASE_SERVICE_ROLE_KEY='<your-supabase-service-role-key>'
SUPABASE_MEDIA_BUCKET='crash-media'

# Postgres (Supabase)
DB_NAME=postgres
DB_USER='<your-db-user>'
DB_PASSWORD='<your-db-password>'
DB_HOST='<your-db-host>'
DB_PORT=5432
```

Where these are used:
- `Backend/crash_backend/settings.py` loads env vars via `python-dotenv`.
- `Backend/core/serializers.py` initializes Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

---

## 5) Run migrations (if you are using Django migrations)

If you are using Django migrations locally:
```powershell
cd c:\ALMM\Programming\CRASH\Backend
python manage.py migrate
```

Note:
- Your main database tables are Supabase-managed and mapped via `db_table`.
- Some projects don’t rely heavily on Django migrations for these tables.

---

## 6) Start the server

```powershell
cd c:\ALMM\Programming\CRASH\Backend
python manage.py runserver
```

You should see:
- `http://127.0.0.1:8000/`
- API under: `http://127.0.0.1:8000/api/v1/`

---

## 7) Test the backend quickly

### A) Login endpoint
POST:
- `/api/v1/auth/login/`

### B) PDF endpoints (WeasyPrint)
Try in browser/Postman after login:
- `GET /api/v1/reports/resolved/export/`
- `GET /api/v1/analytics/export/`

If PDFs fail on Windows:
- Make sure GTK runtime is installed.
- Restart PowerShell.

---

## 8) Common issues

### “No module named dotenv”
- Install deps in the correct venv:
  - `pip install -r requirements.txt`

### Supabase client failed to initialize
- Check your `.env` values.
- Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.

### Google reverse geocoding returns empty
- Confirm `GOOGLE_MAPS_API_KEY` is valid and has Geocoding enabled.
- Check quota/billing in Google Cloud.
