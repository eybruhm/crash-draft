-- ============================================================
-- SUPABASE TIMEZONE FIX - MIGRATION SCRIPT
-- ============================================================
-- Purpose: Convert all TIMESTAMP columns to TIMESTAMPTZ (timezone-aware)
-- This ensures Django (which uses UTC) and Supabase stay in sync
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Convert all TIMESTAMP columns to TIMESTAMPTZ
-- This preserves existing data and adds timezone awareness

-- tbl_admin.created_at
ALTER TABLE tbl_admin 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ 
  USING created_at AT TIME ZONE 'UTC';

-- tbl_users.created_at
ALTER TABLE tbl_users 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ 
  USING created_at AT TIME ZONE 'UTC';

-- tbl_police_offices.created_at
ALTER TABLE tbl_police_offices 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ 
  USING created_at AT TIME ZONE 'UTC';

-- tbl_reports.created_at
ALTER TABLE tbl_reports 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ 
  USING created_at AT TIME ZONE 'UTC';

-- tbl_reports.updated_at
ALTER TABLE tbl_reports 
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ 
  USING updated_at AT TIME ZONE 'UTC';

-- tbl_checkpoints.created_at
ALTER TABLE tbl_checkpoints 
  ALTER COLUMN created_at TYPE TIMESTAMPTZ 
  USING created_at AT TIME ZONE 'UTC';

-- tbl_summary_analytics.last_updated
ALTER TABLE tbl_summary_analytics 
  ALTER COLUMN last_updated TYPE TIMESTAMPTZ 
  USING last_updated AT TIME ZONE 'UTC';

-- tbl_messages.timestamp
ALTER TABLE tbl_messages 
  ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ 
  USING "timestamp" AT TIME ZONE 'UTC';

-- tbl_media.uploaded_at
ALTER TABLE tbl_media 
  ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ 
  USING uploaded_at AT TIME ZONE 'UTC';

-- Step 2: Update DEFAULT values to use timezone-aware NOW()
-- Note: PostgreSQL's NOW() already returns TIMESTAMPTZ when column is TIMESTAMPTZ
-- But we'll be explicit for clarity

-- Update trigger function to use timezone-aware timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW(); -- NOW() returns TIMESTAMPTZ when column is TIMESTAMPTZ
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update friend's function to use timezone-aware timestamp
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
    NOW() -- NOW() returns TIMESTAMPTZ
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

-- ============================================================
-- VERIFICATION QUERIES (Run these to verify the changes)
-- ============================================================

-- Check column types (should show "timestamp with time zone")
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;

-- Test timezone conversion (should show Manila time)
SELECT 
  report_id,
  created_at,
  created_at AT TIME ZONE 'Asia/Manila' AS manila_time
FROM tbl_reports
ORDER BY created_at DESC
LIMIT 5;

