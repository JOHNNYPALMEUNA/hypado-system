-- RLS SECURITY HARDENING SCRIPT
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. Enable RLS on all tables (Safety check)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE installers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_assistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old permissive policies
DROP POLICY IF EXISTS "Public Access Clients" ON clients;
DROP POLICY IF EXISTS "Public Access Projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations for company_settings" ON company_settings;
DROP POLICY IF EXISTS "Enable all access for all users" ON daily_logs;
DROP POLICY IF EXISTS "Allow all operations for events" ON events;
DROP POLICY IF EXISTS "Public Access Installers" ON installers;
DROP POLICY IF EXISTS "Enable all access for all users" ON materials;
DROP POLICY IF EXISTS "Allow all operations for all users" ON purchase_orders;
DROP POLICY IF EXISTS "Enable all access for all users" ON suppliers;
DROP POLICY IF EXISTS "Public Access Suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow all operations for tasks" ON tasks;
DROP POLICY IF EXISTS "Enable delete for all users" ON technical_assistance;
DROP POLICY IF EXISTS "Enable insert for all users" ON technical_assistance;
DROP POLICY IF EXISTS "Enable update for all users" ON technical_assistance;
DROP POLICY IF EXISTS "Auth Access Timeline Events" ON timeline_events;

-- 3. Create SECURE authenticated policies
-- We use 'authenticated' role to ensure only logged-in users can reach the data.

-- Clients
CREATE POLICY "Auth Access Clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Projects
CREATE POLICY "Auth Access Projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Company Settings
CREATE POLICY "Auth Access Company Settings" ON company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Daily Logs
CREATE POLICY "Auth Access Daily Logs" ON daily_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Events
CREATE POLICY "Auth Access Events" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Installers
CREATE POLICY "Auth Access Installers" ON installers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Materials
CREATE POLICY "Auth Access Materials" ON materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase Orders
CREATE POLICY "Auth Access Purchase Orders" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers
CREATE POLICY "Auth Access Suppliers" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tasks
CREATE POLICY "Auth Access Tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Technical Assistance
CREATE POLICY "Auth Access Technical Assistance" ON technical_assistance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Timeline Events
CREATE POLICY "Auth Access Timeline Events" ON timeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
