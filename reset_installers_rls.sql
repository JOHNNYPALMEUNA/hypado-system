-- HOTFIX: Reset RLS for Installers

ALTER TABLE installers ENABLE ROW LEVEL SECURITY;

-- 1. Drop ALL possible existing policies aggressively to ensure no infinite loops remain
DROP POLICY IF EXISTS "Public Access Installers" ON installers;
DROP POLICY IF EXISTS "Auth Access Installers" ON installers;
DROP POLICY IF EXISTS "Allow public read for installers" ON installers;
DROP POLICY IF EXISTS "Enable read access for all users" ON installers;
DROP POLICY IF EXISTS "Enable insert for all users" ON installers;
DROP POLICY IF EXISTS "Enable update for all users" ON installers;
DROP POLICY IF EXISTS "Enable delete for all users" ON installers;
DROP POLICY IF EXISTS "Enable all access for all users" ON installers;

-- 2. Create a single, clean, public policy that allows all operations (to fix the current blackout)
CREATE POLICY "Public Full Access Installers" ON installers 
FOR ALL TO public 
USING (true) WITH CHECK (true);
