# SETUP_FRONTEND (Police Web + Admin Web)

CRASH has **two** separate Vite + React frontends:
- Police Web: `Frontend-Police-JS/`
- Admin Web: `Frontend-Admin/`

Both talk to the same Django backend.

---

## 1) Prerequisites
- Node.js 18+
- npm (bundled with Node)

---

## 2) Police Web setup (`Frontend-Police-JS`)

### A) Install
```powershell
cd c:\ALMM\Programming\CRASH\Frontend-Police-JS
npm install
```

### B) Environment variables
Create:
- `Frontend-Police-JS/.env`

Template:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

Where used:
- Base URL: `Frontend-Police-JS/src/services/api.js`
- Maps key: used by `@react-google-maps/api`

### C) Run
```powershell
npm run dev
```

---

## 3) Admin Web setup (`Frontend-Admin`)

### A) Install
```powershell
cd c:\ALMM\Programming\CRASH\Frontend-Admin
npm install
```

### B) Environment variables
Create:
- `Frontend-Admin/.env`

Template:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
```

Where used:
- Base URL: `Frontend-Admin/src/services/apiClient.js` and `Frontend-Admin/src/constants/index.js`
- Maps key: `Frontend-Admin/src/constants/index.js` and `Frontend-Admin/src/utils/googleMaps.js`

### C) Run
```powershell
npm run dev
```

---

## 4) CORS note (backend)

Backend allows dev origins in:
- `Backend/crash_backend/settings.py` (`CORS_ALLOWED_ORIGINS`)

If your Vite port changes (5173/5174/5175), add it there.

---

## 5) Quick verification checklist

- Backend running: `python manage.py runserver`
- Police Web can login and see dashboard/map
- Admin Web can login and list/create police offices
- Maps load (valid `VITE_GOOGLE_MAPS_API_KEY`)
