
-- SQL SCRIPT TO ADD MISSING COLUMNS TO THE PROJECTS TABLE
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- Check and add columns if they don't exist
DO $$ 
BEGIN 
    -- 1. Installer and Architect
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='installer_id') THEN
        ALTER TABLE projects ADD COLUMN installer_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='architect_id') THEN
        ALTER TABLE projects ADD COLUMN architect_id TEXT;
    END IF;

    -- 2. Logistics & Production
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='production_central') THEN
        ALTER TABLE projects ADD COLUMN production_central TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='pre_assembly_done') THEN
        ALTER TABLE projects ADD COLUMN pre_assembly_done BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='freight_organized') THEN
        ALTER TABLE projects ADD COLUMN freight_organized BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='client_scheduled') THEN
        ALTER TABLE projects ADD COLUMN client_scheduled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='delivery_path') THEN
        ALTER TABLE projects ADD COLUMN delivery_path TEXT;
    END IF;

    -- 3. Dates & Carrier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='freight_carrier_id') THEN
        ALTER TABLE projects ADD COLUMN freight_carrier_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='freight_scheduling_date') THEN
        ALTER TABLE projects ADD COLUMN freight_scheduling_date TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='client_delivery_date') THEN
        ALTER TABLE projects ADD COLUMN client_delivery_date TEXT;
    END IF;

    -- 4. PDF and Extra data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_pdf_url') THEN
        ALTER TABLE projects ADD COLUMN project_pdf_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='outsourced_services') THEN
        ALTER TABLE projects ADD COLUMN outsourced_services JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='attachments') THEN
        ALTER TABLE projects ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;

END $$;
