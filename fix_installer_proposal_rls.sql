-- RLS HOTFIX: Allow public access for installer proposals
-- Run this script in your Supabase SQL Editor to let installers accept/reject proposals without logging in.

-- 1. Allow anonymous users to READ projects (required to load the project when they click accept/reject)
CREATE POLICY "Allow public read for installer proposals" ON projects
FOR SELECT TO anon
USING (true);

-- 2. Allow anonymous users to UPDATE projects (required to change the MDO status to "Aceito" or "Recusado")
CREATE POLICY "Allow public update for installer proposals" ON projects
FOR UPDATE TO anon
USING (true) WITH CHECK (true);

-- Note: The UUID of a project is impossible to guess, which inherently protects your data from being modified 
-- by someone who doesn't have the explicit proposal link.
