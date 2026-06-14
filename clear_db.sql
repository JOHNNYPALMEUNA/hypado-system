-- SUPABASE DATABASE CLEANUP / RESET SCRIPT
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- to delete all data and reset the system for new tests.

-- 1. Disable triggers temporarily to prevent issues during delete
SET session_replication_role = 'replica';

-- 2. Truncate all operational tables and reset identity sequences
TRUNCATE TABLE refund_requests CASCADE;
TRUNCATE TABLE technical_assistance CASCADE;
TRUNCATE TABLE timeline_events CASCADE;
TRUNCATE TABLE daily_logs CASCADE;
TRUNCATE TABLE events CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE installers CASCADE;
TRUNCATE TABLE materials CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE company_settings CASCADE;

-- 3. Re-enable triggers
SET session_replication_role = 'origin';

-- 4. Verify that tables are empty
SELECT 
    (SELECT COUNT(*) FROM projects) as projects_count,
    (SELECT COUNT(*) FROM clients) as clients_count,
    (SELECT COUNT(*) FROM installers) as installers_count,
    (SELECT COUNT(*) FROM refund_requests) as refund_requests_count,
    (SELECT COUNT(*) FROM daily_logs) as daily_logs_count,
    (SELECT COUNT(*) FROM technical_assistance) as technical_assistance_count;
