# FRONTEND_POLICE (Project Structure Guide)

Police Web folder:
- `Frontend-Police-JS/`

Tech:
- React + Vite
- Axios service layer
- Google Maps (via `@react-google-maps/api`)

---

## 1) Folder map

### /Frontend-Police-JS/
- `/Frontend-Police-JS/package.json` — dependencies + scripts
- `/Frontend-Police-JS/vite.config.js` — Vite config
- `/Frontend-Police-JS/tailwind.config.js` — Tailwind config
- `/Frontend-Police-JS/docs/LOCAL_SETUP.md` — older local setup guide

### /Frontend-Police-JS/src/
- `/src/main.jsx` — app entry
- `/src/App.jsx` — route layout + tabs
- `/src/index.css`, `/src/App.css` — styles

#### /src/assets/
- `/src/assets/markers/` — custom map marker icons

#### /src/constants/
- `/src/constants/index.js` — **polling intervals** and shared constants
  - Search keyword: `POLLING_INTERVALS`

#### /src/contexts/
- `/src/contexts/AuthContext.jsx` — authentication context (tokens + user)

#### /src/pages/
Pages (main screens):
- `/src/pages/Login.jsx` — police login
- `/src/pages/Dashboard.jsx` — active reports list + actions
- `/src/pages/Map.jsx` — live map (reports + checkpoints + offices)
- `/src/pages/Analytics.jsx` — analytics dashboard + PDF export
- `/src/pages/ResolvedCases.jsx` — resolved cases list + PDF export

#### /src/components/
Major UI components:
- `NavigationTabs.jsx` — top navigation
- `PageHeader.jsx` — header UI
- `ReportDetailsModal.jsx` — report detail view
- `ReportChatModal.jsx` — chat modal (polling)
- `ResolvedCaseDetailsModal.jsx` — resolved case detail modal
- `GlobalReportNotifier.jsx` — background polling + sound alerts
- `DirectionsModal.jsx` — Google Maps route/QR
- Checkpoints:
  - `AddCheckpointModal.jsx`
  - `EditCheckpointModal.jsx`
  - `MapLegendModal.jsx`

#### /src/services/
API service layer (Axios):
- `/src/services/api.js` — axios client + JWT interceptors
- `/src/services/authService.js` — login/logout token storage
- `/src/services/reportsService.js` — reports list/detail/status update
- `/src/services/mapService.js` — map endpoint wrapper
- `/src/services/analyticsService.js` — analytics endpoints + PDF export
- `/src/services/resolvedCasesService.js` — resolved cases endpoints + PDF export
- `/src/services/messagesService.js` — chat endpoints
- `/src/services/mediaService.js` — media endpoints
- `/src/services/checkpointsService.js` — checkpoints endpoints

---

## 2) Important code anchors (easy search)

### API base URL
- File: `Frontend-Police-JS/src/services/api.js`
- Keyword: `VITE_API_BASE_URL`

### Polling intervals
- File: `Frontend-Police-JS/src/constants/index.js`
- Keyword: `POLLING_INTERVALS`

### Chat polling
- File: `Frontend-Police-JS/src/components/ReportChatModal.jsx`
- Keyword: `setInterval(fetchMessages`

### Live map polling
- File: `Frontend-Police-JS/src/pages/Map.jsx`
- Keyword: `setInterval(fetchMapData`

---

## 3) Role + scoping reminder

Police users should only see reports assigned to their office.
Backend enforces this scoping on:
- `/reports/`
- `/admin/map/data/` (when used by police)
- resolved cases / analytics when `scope=our_office`

