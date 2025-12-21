# FRONTEND_ADMIN (Project Structure Guide)

Admin Web folder:
- `Frontend-Admin/`

Tech:
- React + Vite
- Axios service layer
- Google Maps JS API loaded manually (script loader)

---

## 1) Folder map

### /Frontend-Admin/
- `/Frontend-Admin/package.json` — dependencies + scripts
- `/Frontend-Admin/vite.config.js` — Vite config
- `/Frontend-Admin/tailwind.config.js` — Tailwind config
- `/Frontend-Admin/.env` — env vars (not committed)

### /Frontend-Admin/src/
- `/src/main.jsx` — app entry
- `/src/App.jsx` — routes + protected routes
- `/src/index.css` — styles

#### /src/constants/
- `/src/constants/index.js`
  - `ROUTES` — route paths
  - `STORAGE_KEYS` — where tokens/users are stored
  - `API_BASE_URL` — derived from `VITE_API_BASE_URL`
  - `GOOGLE_API_KEY` — from `VITE_GOOGLE_MAPS_API_KEY`

#### /src/utils/
- `/src/utils/auth.js` — token/user storage helpers
- `/src/utils/googleMaps.js` — Google Maps script loader (polling/wait logic)

#### /src/services/
API service layer:
- `/src/services/apiClient.js` — Axios client + JWT refresh logic
- `/src/services/api.js` — high-level functions (`loginAdmin`, `listPolice`, `createManualReport`, etc.)

#### /src/pages/
Main pages:
- `/src/pages/Login.jsx` — admin login
- `/src/pages/Dashboard.jsx` — map + stats (polls every 30s)
- `/src/pages/PoliceAccountManagement.jsx` — CRUD police offices
- `/src/pages/ManualReport.jsx` — admin manual report insertion tool
- `/src/pages/PasswordHashConverter.jsx` — UI tool (server endpoint exists too)
- `/src/pages/Profile.jsx` — admin profile + change password

#### /src/components/
Common UI components:
- (varies; see `Frontend-Admin/src/components/`)

---

## 2) Important code anchors

### Admin map refresh polling
- File: `Frontend-Admin/src/pages/Dashboard.jsx`
- Keyword: `setInterval(loadMapData, 30000)`

### API base URL
- File: `Frontend-Admin/src/services/apiClient.js`
- Keyword: `VITE_API_BASE_URL`

### Google Maps loader
- File: `Frontend-Admin/src/utils/googleMaps.js`
- Keyword: `loadGoogleMapsApi`

