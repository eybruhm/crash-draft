# Combined Supabase Database Schema (Timezone-Aware Version)

## Overview
This schema uses `TIMESTAMPTZ` (timestamp with timezone) instead of `TIMESTAMP` to ensure proper timezone handling with Django backend.

**Key Changes:**
- All datetime columns use `TIMESTAMPTZ` instead of `TIMESTAMP`
- Default values use `NOW()` which returns timezone-aware timestamps
- Compatible with Django's `USE_TZ=True` setting
- Frontend can continue using `timeZone: 'Asia/Manila'` for display

---

## 1. EXTENSIONS

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 2. ENUM TYPES

```sql
CREATE TYPE report_status_enum AS ENUM (
  'Pending',
  'Acknowledged',
  'En Route',
  'Resolved',
  'On Scene',
  'Canceled'
);

CREATE TYPE message_sender_type_enum AS ENUM (
  'police',
  'user'
);

CREATE TYPE media_file_type_enum AS ENUM (
  'image',
  'video'
);
```

---

## 3. TABLES

### tbl_admin
```sql
CREATE TABLE tbl_admin (
  admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  contact_no VARCHAR(15),
  created_at TIMESTAMPTZ DEFAULT NOW()  -- Changed to TIMESTAMPTZ
);
```

### tbl_users
```sql
CREATE TABLE tbl_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  birthdate DATE NOT NULL,
  sex VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_number VARCHAR(20),
  region VARCHAR(50),
  city VARCHAR(50),
  barangay VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()  -- Changed to TIMESTAMPTZ
);
```

### tbl_police_offices
```sql
CREATE TABLE tbl_police_offices (
  office_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  head_officer VARCHAR(100),
  contact_number VARCHAR(20),
  location_city VARCHAR(50),
  location_barangay VARCHAR(50),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- Changed to TIMESTAMPTZ
  FOREIGN KEY (created_by)
    REFERENCES tbl_admin(admin_id)
    ON DELETE SET NULL
);
```

### tbl_reports
```sql
CREATE TABLE tbl_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID,
  assigned_office_id UUID,
  category VARCHAR(30) NOT NULL,
  description TEXT,
  status report_status_enum DEFAULT 'Pending',
  location_city VARCHAR(50),
  location_barangay VARCHAR(50),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- Changed to TIMESTAMPTZ
  remarks TEXT,
  updated_at TIMESTAMPTZ,  -- Changed to TIMESTAMPTZ (no default, set by trigger)
  FOREIGN KEY (reporter_id)
    REFERENCES tbl_users(user_id)
    ON DELETE SET NULL,
  FOREIGN KEY (assigned_office_id)
    REFERENCES tbl_police_offices(office_id)
    ON DELETE SET NULL
);
```

### tbl_checkpoints
```sql
CREATE TABLE tbl_checkpoints (
  checkpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID,
  checkpoint_name VARCHAR(100) NOT NULL,
  contact_number VARCHAR(20),
  time_start TIME,
  time_end TIME,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  assigned_officers TEXT,
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),  -- Changed to TIMESTAMPTZ
  FOREIGN KEY (office_id)
    REFERENCES tbl_police_offices(office_id)
    ON DELETE CASCADE
);
```

### tbl_summary_analytics
```sql
CREATE TABLE tbl_summary_analytics (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_city VARCHAR(50) NOT NULL,
  location_barangay VARCHAR(50) NOT NULL,
  category VARCHAR(30) NOT NULL,
  report_count INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()  -- Changed to TIMESTAMPTZ
);
```

### tbl_messages
```sql
CREATE TABLE tbl_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID,
  sender_id UUID,
  sender_type message_sender_type_enum NOT NULL,
  receiver_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT NOW(),  -- Changed to TIMESTAMPTZ
  FOREIGN KEY (report_id)
    REFERENCES tbl_reports(report_id)
    ON DELETE CASCADE
);
```

### tbl_media
```sql
CREATE TABLE tbl_media (
  media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url VARCHAR(255) NOT NULL,
  report_id UUID,
  file_type media_file_type_enum NOT NULL,
  sender_id UUID NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),  -- Changed to TIMESTAMPTZ
  FOREIGN KEY (report_id)
    REFERENCES tbl_reports(report_id)
    ON DELETE CASCADE
);
```

---

## 4. TRIGGERS

```sql
-- Trigger to automatically update updated_at when report is modified
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();  -- NOW() returns TIMESTAMPTZ when column is TIMESTAMPTZ
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON tbl_reports
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```

---

## 5. INDEXES

```sql
CREATE INDEX idx_reports_status ON tbl_reports(status);
CREATE INDEX idx_reports_location ON tbl_reports(latitude, longitude);
CREATE INDEX idx_reports_office ON tbl_reports(assigned_office_id);
CREATE INDEX idx_media_report ON tbl_media(report_id);
CREATE INDEX idx_messages_report ON tbl_messages(report_id);
```

---

## 6. FRIEND'S HAVERSINE FUNCTIONS

### get_nearby_police
```sql
DROP FUNCTION IF EXISTS get_nearby_police;
CREATE OR REPLACE FUNCTION get_nearby_police(user_lat float, user_long float)
RETURNS TABLE (
  office_id uuid,
  office_name varchar,
  contact_number varchar,
  latitude numeric,
  longitude numeric,
  dist_meters float
)
LANGUAGE sql
AS $$
  SELECT
    office_id,
    office_name,
    contact_number,
    latitude,
    longitude,
    (
      6371000 * acos(
        cos(radians(user_lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(user_long)) +
        sin(radians(user_lat)) * sin(radians(latitude))
      )
    ) AS dist_meters
  FROM
    tbl_police_offices
  ORDER BY
    dist_meters ASC
  LIMIT 5;
$$;
```

### create_emergency_sos
```sql
DROP FUNCTION IF EXISTS create_emergency_sos;
CREATE OR REPLACE FUNCTION create_emergency_sos(
  p_user_id uuid,
  p_lat float,
  p_long float,
  p_category text,
  p_description text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_nearest_office_id uuid;
  v_nearest_office_name text;
  v_new_report_id uuid;
BEGIN
  SELECT office_id, office_name
  INTO v_nearest_office_id, v_nearest_office_name
  FROM tbl_police_offices
  ORDER BY (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(p_long)) +
        sin(radians(p_lat)) * sin(radians(latitude))
      )
  ) ASC
  LIMIT 1;

  IF v_nearest_office_id IS NULL THEN
    RAISE EXCEPTION 'No police stations found in database.';
  END IF;

  INSERT INTO tbl_reports (
    reporter_id,
    assigned_office_id,
    latitude,
    longitude,
    category,
    description,
    status,
    created_at
  )
  VALUES (
    p_user_id,
    v_nearest_office_id,
    p_lat,
    p_long,
    p_category,
    p_description,
    'Pending',
    NOW()  -- NOW() returns TIMESTAMPTZ
  )
  RETURNING report_id INTO v_new_report_id;

  RETURN json_build_object(
    'report_id', v_new_report_id,
    'assigned_office_id', v_nearest_office_id,
    'assigned_office_name', v_nearest_office_name,
    'message', 'SOS Sent! Connected to nearest station.'
  );
END;
$$;
```

---

## Notes for Friend's Mobile App

**Changes from original schema:**
1. All `TIMESTAMP` columns are now `TIMESTAMPTZ` (timestamp with timezone)
2. When inserting timestamps, use `NOW()` or provide timezone-aware timestamps
3. When querying, timestamps are stored in UTC but can be converted:
   ```sql
   SELECT created_at AT TIME ZONE 'Asia/Manila' AS manila_time FROM tbl_reports;
   ```
4. The haversine functions remain unchanged and work the same way

**Compatibility:**
- Django backend: ✅ Fully compatible (Django already uses timezone-aware datetimes)
- Frontend: ✅ No changes needed (frontend already converts to Manila time)
- Mobile app: ⚠️ May need minor adjustments if it expects naive timestamps

---

## Summary of Changes

| Column | Old Type | New Type | Table |
|--------|----------|----------|--------|
| created_at | TIMESTAMP | TIMESTAMPTZ | tbl_admin |
| created_at | TIMESTAMP | TIMESTAMPTZ | tbl_users |
| created_at | TIMESTAMP | TIMESTAMPTZ | tbl_police_offices |
| created_at | TIMESTAMP | TIMESTAMPTZ | tbl_reports |
| updated_at | TIMESTAMP | TIMESTAMPTZ | tbl_reports |
| created_at | TIMESTAMP | TIMESTAMPTZ | tbl_checkpoints |
| last_updated | TIMESTAMP | TIMESTAMPTZ | tbl_summary_analytics |
| timestamp | TIMESTAMP | TIMESTAMPTZ | tbl_messages |
| uploaded_at | TIMESTAMP | TIMESTAMPTZ | tbl_media |

