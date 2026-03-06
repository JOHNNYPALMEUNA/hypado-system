-- Add the optional work_name column to the daily_logs table.
-- This allows recording parts or events for older projects not registered in the system.

ALTER TABLE daily_logs 
ADD COLUMN IF NOT EXISTS work_name VARCHAR(255);
