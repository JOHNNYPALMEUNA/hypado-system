-- Add the pdf_summary column to the projects table
-- Run this in your Supabase SQL Editor to enable persistent AI PDF analysis
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pdf_summary TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
