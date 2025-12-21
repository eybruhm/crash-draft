# POLLING_INTERVALS (Police + Admin)

CRASH uses polling in a few places to keep the UI updated.
This doc shows:
- **What polls**
- **How often**
- **Where to find it in code** (file + search keyword)

---

## Police Web (`Frontend-Police-JS`)

### 1) Central polling config (recommended place to edit)
File:
- `Frontend-Police-JS/src/constants/index.js`

Search keyword:
- `POLLING_INTERVALS`

Actual values (milliseconds):
- `GLOBAL_NOTIFIER_AND_DASHBOARD`: `5000` (5 seconds)
- `REPORT_CHAT`: `3000` (3 seconds)
- `LIVE_MAP`: `15000` (15 seconds)

Note:
- The comment next to `GLOBAL_NOTIFIER_AND_DASHBOARD` mentions 15 seconds but the value is **5000ms** (5s). The value is what the app really uses.

### 2) Dashboard polling (reports list)
File:
- `Frontend-Police-JS/src/pages/Dashboard.jsx`

Search keyword:
- `setInterval(fetchReports` OR `POLLING_INTERVALS.GLOBAL_NOTIFIER_AND_DASHBOARD`

### 3) Global notifier polling (sound alert)
File:
- `Frontend-Police-JS/src/components/GlobalReportNotifier.jsx`

Search keyword:
- `setInterval(poll` OR `POLLING_INTERVALS.GLOBAL_NOTIFIER_AND_DASHBOARD`

### 4) Live Map polling
File:
- `Frontend-Police-JS/src/pages/Map.jsx`

Search keyword:
- `setInterval(fetchMapData` OR `POLLING_INTERVALS.LIVE_MAP`

### 5) Report chat polling
File:
- `Frontend-Police-JS/src/components/ReportChatModal.jsx`

Search keyword:
- `setInterval(fetchMessages` OR `POLLING_INTERVALS.REPORT_CHAT`

---

## Admin Web (`Frontend-Admin`)

Admin polling is simpler and mostly used for:
- Map/dashboard refresh
- Google Maps script load checks

### 1) Admin dashboard map refresh
File:
- `Frontend-Admin/src/pages/Dashboard.jsx`

Search keyword:
- `setInterval(loadMapData`

Interval:
- `30000` ms (30 seconds)

### 2) Google Maps script availability checks
File:
- `Frontend-Admin/src/utils/googleMaps.js`

Search keyword:
- `setInterval(() => {` and `maxAttempts`

Intervals:
- Poll existing script: every `100` ms (up to 20s)
- Fallback poll: every `100` ms (up to 10s)

These are not “data polling”; they’re just “wait until Maps loads”.

---

## Polling advice (simple)
- Keep chat polling short (3–5 seconds is ok).
- Keep map/dashboard polling longer (10–30 seconds) to avoid spamming the server.
- If you deploy publicly, consider WebSockets or Supabase Realtime later (optional future improvement).
