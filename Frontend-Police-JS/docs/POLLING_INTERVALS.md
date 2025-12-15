# Polling Intervals in Police Web

This document lists all polling intervals (auto-refresh timers) in the Police Web frontend and where to change them.

## Quick Reference

**All polling intervals are centralized in:** `Frontend-Police-JS/src/constants/index.js`

**To change any polling interval:**
1. Open `Frontend-Police-JS/src/constants/index.js`
2. Modify the values in `POLLING_INTERVALS` object
3. All components will automatically use the new interval

**Search for "polling interval" in code to find all usages.**

---

## Polling Locations

### 1. Global Report Notifier (Sound Notification)
**File:** `Frontend-Police-JS/src/components/GlobalReportNotifier.jsx`  
**Constant:** `POLLING_INTERVALS.GLOBAL_NOTIFIER_AND_DASHBOARD`  
**Current Interval:** `15000` milliseconds (15 seconds)  
**Purpose:** Polls for new reports to play sound notification across all pages

**Note:** Uses the same interval as Dashboard to keep notifications and dashboard in sync.

---

### 2. Dashboard Page (Reports List)
**File:** `Frontend-Police-JS/src/pages/Dashboard.jsx`  
**Constant:** `POLLING_INTERVALS.GLOBAL_NOTIFIER_AND_DASHBOARD`  
**Current Interval:** `15000` milliseconds (15 seconds)  
**Purpose:** Polls for new reports assigned to this office

**Note:** Uses the same interval as GlobalReportNotifier so when a sound notification plays, the new report immediately appears in the dashboard.

---

### 3. Live Map Page (Map Data Refresh)
**File:** `Frontend-Police-JS/src/pages/Map.jsx`  
**Constant:** `POLLING_INTERVALS.LIVE_MAP`  
**Current Interval:** `15000` milliseconds (15 seconds)  
**Purpose:** Refreshes map data (reports, offices, checkpoints) on the Live Map page

---

### 4. Resolved Cases Page
**File:** `Frontend-Police-JS/src/pages/ResolvedCases.jsx`  
**Current Interval:** None (fetches once on mount or when filters change)  
**Purpose:** Loads resolved cases when the page opens or filters change

**Note:** Resolved Cases does NOT auto-refresh. It only fetches when filters change or the page loads.

---

## Summary

| Component | File | Constant | Interval | Auto-refresh? |
|-----------|------|----------|----------|---------------|
| Global Report Notifier | `GlobalReportNotifier.jsx` | `GLOBAL_NOTIFIER_AND_DASHBOARD` | 15 seconds | ✅ Yes |
| Dashboard | `Dashboard.jsx` | `GLOBAL_NOTIFIER_AND_DASHBOARD` | 15 seconds | ✅ Yes |
| Live Map | `Map.jsx` | `LIVE_MAP` | 15 seconds | ✅ Yes |
| Resolved Cases | `ResolvedCases.jsx` | N/A | N/A | ❌ No |

---

## Recommended Intervals

- **15 seconds (current):** Good for real-time updates without overloading the server
- **30 seconds:** More server-friendly, slight delay in updates
- **10 seconds:** More responsive, but higher server load
- **5 seconds:** Very responsive, but may cause performance issues with many users

---

## How to Change Polling Intervals

All polling intervals are centralized in `Frontend-Police-JS/src/constants/index.js`:

```javascript
export const POLLING_INTERVALS = {
  // Global Report Notifier and Dashboard use the same interval
  // to keep notifications and dashboard in sync
  GLOBAL_NOTIFIER_AND_DASHBOARD: 15000, // 15 seconds
  
  // Live Map polling interval
  LIVE_MAP: 15000, // 15 seconds
}
```

**To change an interval:**
1. Open `Frontend-Police-JS/src/constants/index.js`
2. Modify the value (in milliseconds) for the desired constant
3. Save the file - all components using that constant will automatically use the new interval

**Example:** To change Dashboard and GlobalReportNotifier to poll every 10 seconds:
```javascript
GLOBAL_NOTIFIER_AND_DASHBOARD: 10000, // 10 seconds
```

---

## Implementation Details

All components import and use the constants like this:

```javascript
import { POLLING_INTERVALS } from '../constants'

// In useEffect or component:
const pollInterval = setInterval(fetchData, POLLING_INTERVALS.GLOBAL_NOTIFIER_AND_DASHBOARD)
```

This ensures:
- ✅ Easy to change all intervals from one place
- ✅ Consistent intervals across related components
- ✅ No magic numbers scattered in code
- ✅ Clear documentation of what each interval is for

