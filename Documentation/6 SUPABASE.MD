# SUPABASE (Database + Storage)

This document is the **source of truth** for CRASH’s Supabase setup (database schema + media storage).

Scope of this doc:
- Supabase **Postgres schema** (timezone-aware)
- Required **enum values**, triggers, and indexes
- Supabase **Storage bucket** for media (images/videos) + recommended policies

> Note: This project stores timestamps as `TIMESTAMPTZ` (timezone-aware). That is the “standard” modern setup.

---

## 1) Why `TIMESTAMPTZ` is the “standard” setup

### The short version
- **Database stores UTC with timezone info**: `TIMESTAMPTZ` values are stored and interpreted as *absolute points in time*.
- **Django is timezone-aware** (`USE_TZ=True`): Django expects the DB to understand timezones and it converts correctly.
- **Frontend displays Manila time**: the UI can show `Asia/Manila` without breaking the meaning of timestamps.

### Why `TIMESTAMP` (without timezone) causes bugs
`TIMESTAMP` is “naive” (no timezone). If you store `2025-12-21 20:20:00` there’s no way to know if that means Manila time or UTC.
Different systems may interpret it differently, which creates the classic **8-hour shift** problem.

### What happens with the standard flow (recommended)
1. User creates a report at **8:20 PM Manila**.
2. Backend converts it to **UTC** for storage (or DB stores it as UTC).
3. DB stores a timezone-aware timestamp (example): `2025-12-21T12:20:00Z`.
4. Frontend displays it as `Asia/Manila` again → **8:20 PM**.

---

## 2) Supabase Project Setup (Checklist)

### A) Create a Supabase project
- Create a new project in Supabase.
- Save these values (used by the Django backend):
  - Project URL
  - Service Role key (keep secret)
  - Database connection host/user/password/port

### B) Run the timezone-aware schema
You said you are using:
- `Word Files/Supabase Code (Combined - Timezone Fixed).md`

Recommended workflow:
- Copy the SQL blocks from that file and run them in:
  - Supabase Dashboard → **SQL Editor**

Key properties of that schema:
- Datetime columns use `TIMESTAMPTZ`.
- Defaults use `NOW()`.
- Trigger updates `tbl_reports.updated_at` automatically.

### C) Verify schema types
Run this in Supabase SQL Editor:
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;
```
You should see **timestamp with time zone**.

---

## 3) Database Schema Overview (CRASH)

This is the logical schema (high level):

### Core tables
- `tbl_admin` — admin accounts
- `tbl_police_offices` — police office accounts
- `tbl_users` — citizen accounts (mobile)
- `tbl_reports` — incident reports
- `tbl_messages` — chat messages (police ↔ citizen)
- `tbl_media` — uploaded media metadata (file URL + type)
- `tbl_checkpoints` — police checkpoints
- `tbl_summary_analytics` — cached analytics counts

### Enums (must match exactly)
From your updated schema:
- `report_status_enum`: `Pending`, `Acknowledged`, `En Route`, `Resolved`, `On Scene`, `Canceled`
- `message_sender_type_enum`: `police`, `user`
- `media_file_type_enum`: `image`, `video`

---

## 4) Triggers

### `tbl_reports.updated_at` auto-update
The schema includes a trigger function:
- `trigger_set_timestamp()`

And a trigger:
- `set_timestamp` (BEFORE UPDATE on `tbl_reports`)

This ensures when police update a report (status/remarks), the `updated_at` column is updated.

---

## 5) Supabase Storage (Media: images/videos)

CRASH stores media in **Supabase Storage** and saves only the resulting `file_url` in `tbl_media`.

### A) Create the bucket
- Supabase Dashboard → **Storage** → Create bucket
- Bucket name (matches backend env var): `crash-media`
- Recommended: mark it **Public** because the backend currently uses `get_public_url(...)`.

If you do **not** want a public bucket:
- You must change the backend to generate **signed URLs** instead of `get_public_url`.

### B) Expected object path format
Backend uses a path like:
- `reports/<report_id>/<file_type>/<random_filename>`

Example:
- `reports/8b7a.../image/3f9c...jpg`

### C) Recommended Storage policies (RLS)
Even if the bucket is public for READ, you still want to restrict WRITE.

In Supabase, storage policies live on `storage.objects`.
These examples are typical and safe for your backend design (uploads happen using **service role key**):

```sql
-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public can read objects in crash-media
CREATE POLICY "Public read crash-media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'crash-media');

-- Only service_role can write objects in crash-media
CREATE POLICY "Service role insert crash-media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'crash-media' AND auth.role() = 'service_role');

CREATE POLICY "Service role update crash-media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'crash-media' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'crash-media' AND auth.role() = 'service_role');

CREATE POLICY "Service role delete crash-media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'crash-media' AND auth.role() = 'service_role');
```

If you later want citizen uploads **directly from mobile** (without routing through Django):
- You will need a different policy strategy tied to Supabase Auth.

---

## 6) How the Backend Uses Supabase

The Django backend initializes a Supabase client once in:
- `Backend/core/serializers.py` (search: `create_client`)

Uploads happen in the mobile report endpoint:
- `Backend/core/views/mobile.py`

Key behavior:
- Upload uses `SUPABASE_MEDIA_BUCKET` (defaults to `crash-media`).
- Backend creates a `tbl_media` row containing the public file URL.

---

## 7) Troubleshooting

### “Bucket not found”
- Create the bucket in Supabase Storage
- Ensure the bucket name matches your backend `.env`: `SUPABASE_MEDIA_BUCKET`

### Timestamps look wrong
- Confirm DB columns are `TIMESTAMPTZ`.
- Confirm Django settings: `USE_TZ=True`, `TIME_ZONE='Asia/Manila'`.
- Confirm API outputs ISO 8601 with timezone info.
