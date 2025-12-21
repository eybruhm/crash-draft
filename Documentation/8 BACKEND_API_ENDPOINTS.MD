# BACKEND_API_ENDPOINTS (Postman Guide)

Base URL (dev):
- `http://localhost:8000/api/v1`

Auth header for protected endpoints:
- `Authorization: Bearer <access_token>`

---

## 1) Authentication

### POST `/auth/login/`
Purpose: login as Admin or Police.

Body (JSON):
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

Success response (shape):
```json
{
  "message": "Admin login successful",
  "role": "admin",
  "user": { "admin_id": "...", "username": "...", "email": "..." },
  "access": "<jwt>",
  "refresh": "<jwt>"
}
```

---

## 2) Admin endpoints

### GET `/admin/map/data/`
Purpose: Map data for Admin dashboard.

Optional query params:
- `scope_reports`: `all` | `our_office`
- `scope_checkpoints`: `all` | `our_office`

Headers:
- `Authorization: Bearer <admin_token>`

### CRUD `/admin/police-offices/`
Router endpoints:
- `GET /admin/police-offices/` — list
- `POST /admin/police-offices/` — create
- `PATCH /admin/police-offices/{office_id}/` — update
- `DELETE /admin/police-offices/{office_id}/` — delete

Create body example:
```json
{
  "office_name": "Manila Police Station",
  "email": "manila.station@crash.gov",
  "password": "plain_password",
  "head_officer": "Chief Rodriguez",
  "contact_number": "+63 2 123 4567",
  "latitude": 14.5995,
  "longitude": 120.9842
}
```

### POST `/admin/reports/manual/`
Purpose: Admin manual report creation.

Body example (JSON) (fields depend on serializer):
```json
{
  "category": "Theft",
  "description": "Manual entry",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "reporter": "<tbl_users.user_id>",
  "created_at": "2025-12-21T20:20:00+08:00",
  "updated_at": "2025-12-21T20:20:00+08:00"
}
```

### GET `/admin/users/search/?q=...`
Purpose: Search citizen users (for manual report tool).

Example:
- `/admin/users/search/?q=john`

### POST `/admin/analytics/update/`
Purpose: rebuild analytics cache.

### Admin profile
- `GET /admin/profile/`
- `PATCH /admin/profile/`
- `PATCH /admin/profile/password/`

---

## 3) Police endpoints (reports)

### GET `/reports/`
Purpose: list active reports (non-resolved).

Query params:
- `status` (optional)
- `category` (optional)

Example:
- `/reports/?status=Pending`
- `/reports/?category=Theft`

Notes:
- Backend filters police users to **their assigned office**.

### GET `/reports/{report_id}/`
Purpose: report details.

### PATCH `/reports/{report_id}/`
Purpose: update status + remarks.

Body example:
```json
{
  "status": "Acknowledged",
  "remarks": "Officers dispatched"
}
```

### GET `/reports/{report_id}/route/`
Purpose: directions URL + QR.

---

## 4) Messages (nested)

### GET `/reports/{report_id}/messages/`
Purpose: list messages for that report.

### POST `/reports/{report_id}/messages/`
Body example:
```json
{
  "sender_id": "<uuid>",
  "sender_type": "police",
  "receiver_id": "<uuid>",
  "message_content": "We are on our way."
}
```

---

## 5) Checkpoints

### CRUD `/checkpoints/`
- `GET /checkpoints/`
- `POST /checkpoints/`
- `PATCH /checkpoints/{checkpoint_id}/`
- `DELETE /checkpoints/{checkpoint_id}/`

### GET `/checkpoints/active/`
Purpose: only currently active checkpoints.

---

## 6) Media

### POST `/media/` (multipart)
Purpose: upload evidence.

Form-data keys (typical):
- `report`: `<report_id>`
- `file_type`: `image` | `video`
- `sender_id`: `<uuid>`
- `uploaded_file`: *(attach file)*

Notes:
- Police can only upload to reports assigned to their office.

### GET `/media/?report_id=<uuid>`
Purpose: list media for a report.

---

## 7) Analytics

All analytics endpoints accept filters:
- `days` (default 30; use `0` for all-time)
- `scope` = `all` | `our_office`
- `office_id` (uuid)
- `city`, `barangay`, `category`

### GET `/analytics/summary/overview/`
### GET `/analytics/hotspots/locations/`
### GET `/analytics/hotspots/categories/`
### GET `/analytics/export/` (PDF)

Example filter combos:
- `/analytics/summary/overview/?days=7&scope=our_office`
- `/analytics/hotspots/locations/?days=30&city=Manila`
- `/analytics/hotspots/categories/?days=90&category=Theft`

---

## 8) Resolved cases

### GET `/reports/resolved/`
Same filter parameters as analytics.

### GET `/reports/resolved/export/` (PDF)
Same filters.

### GET `/reports/{report_id}/export/` (PDF)
Exports one case file.

---

## 9) Mobile (citizen) endpoint (not part of your web docs, but exists)

### POST `/mobile/reports/` (multipart)
Creates a report and optionally uploads files to Supabase Storage.

Form-data example:
- `reporter`: `<tbl_users.user_id>`
- `category`: `Emergency`
- `latitude`: `14.5995`
- `longitude`: `120.9842`
- `description`: `optional`
- `uploaded_files`: attach 1..N files

Limits enforced server-side:
- Max 3 images
- Max 2 videos
- Max 15MB per file

