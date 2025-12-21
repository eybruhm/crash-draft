# SYSTEM FEATURES (Mapped to the Problem Statement)

This document lists CRASH system features and why they exist.

Scope note:
- CRASH has **Police Web** and **Admin Web**.
- A **Mobile/Citizen** API exists in the backend, but mobile implementation is not documented here (only the system context is mentioned).

---

## 1) Core reporting + response workflow

### Citizen incident reporting (backend supports it)
- Citizens can create reports with:
  - category
  - description
  - GPS location (lat/lng)
  - optional media (images/videos)

Why:
- Enables real-time reporting and richer evidence.

### Police report queue (Police Web)
- View assigned reports (office-scoped)
- Update report status (e.g., pending → acknowledged → responding → resolved)
- Add remarks

Why:
- Helps police manage and prioritize incidents.

---

## 2) Live map + location features

### Live map visualization
- View incident locations on the map
- Show relevant markers (reports, checkpoints, police offices)

Why:
- Faster situational awareness and routing.

### Directions / route generation (per report)
- Generates directions link + QR (for quick sharing)

Why:
- Helps responders navigate efficiently.

### Reverse geocoding
- Converts lat/lng into readable location fields (city/barangay/address)

Why:
- Supports analytics, filtering, and reporting clarity.

---

## 3) Chat / communication

### Report chat (police ↔ citizen)
- Message thread per report
- Sender type is tracked (admin/police/user)

Why:
- Enables two-way clarification, status updates, and evidence requests.

---

## 4) Evidence / media handling

### Upload media evidence
- Images and videos are uploaded to Supabase Storage
- Metadata saved in DB table for retrieval

Why:
- Provides a durable, centralized evidence store.

---

## 5) Checkpoints

### Create and manage checkpoints
- Add/edit/delete checkpoints
- Active checkpoints endpoint for map display

Why:
- Helps with traffic control and planned safety operations.

---

## 6) Analytics + exports

### Analytics dashboard
- Summary stats (counts by status/category)
- Hotspots by location
- Category concentration
- Time-window filtering (e.g. last 7/30/90 days)
- Scope filtering (`all` vs `our_office`)

Why:
- Supports decision-making, planning, and performance monitoring.

### PDF exports
- Export analytics reports
- Export resolved cases list
- Export a single report case file

Why:
- Needed for official reporting, audits, and documentation.

---

## 7) Role-based access + scoping

### Roles supported
- Admin
- Police office
- Citizen/user (mobile)

### Police office scoping
- Police views and analytics should only show reports assigned to that office.

Why:
- Prevents data leakage and keeps screens relevant.

---

## 8) Operational correctness features

### Timezone-correct timestamps
- Backend uses timezone-aware datetime output (ISO-8601).
- Database is expected to store timestamps as `TIMESTAMPTZ`.

Why:
- Accurate timelines are critical for incident management and audits.

