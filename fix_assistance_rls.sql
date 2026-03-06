-- RLS HOTFIX: Allow public read access for assistance report and installers
-- Run this script in your Supabase SQL Editor to let the public view the assistance report correctly

-- 1. Allow anonymous users to READ technical_assistance (needed to load the data on the screen)
CREATE POLICY "Allow public read for assistance report" ON technical_assistance
FOR SELECT TO anon
USING (true);

-- 2. Allow anonymous users to READ installers (needed to show the name and phone of the technician attached to the assistance)
CREATE POLICY "Allow public read for installers" ON installers
FOR SELECT TO anon
USING (true);
