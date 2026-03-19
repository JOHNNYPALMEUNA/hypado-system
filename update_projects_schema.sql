-- SQL script to enhance project tracking with status timestamps
-- Use this in your Supabase SQL Editor

-- 1. Add status_updated_at to track how long a project stays in a specific phase
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create the update function
CREATE OR REPLACE FUNCTION update_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the currentStatus value actually changed
    IF (OLD.currentStatus IS DISTINCT FROM NEW.currentStatus) THEN
        NEW.status_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_update_status_timestamp ON projects;
CREATE TRIGGER tr_update_status_timestamp
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_status_timestamp();

-- 4. Set initial value for existing records using created_at
UPDATE projects SET status_updated_at = created_at WHERE status_updated_at IS NULL;
