-- Create technical_assistance table
CREATE TABLE IF NOT EXISTS public.technical_assistance (
    id text PRIMARY KEY,
    client_id text,
    client_name text,
    project_id text,
    work_name text,
    request_date text,
    scheduled_date text,
    scheduled_time text,
    reported_problem text,
    photo_url text,
    technician_id text,
    visit_result text,
    pending_issues text,
    return_date text,
    final_observations text,
    status text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
alter publication supabase_realtime add table public.technical_assistance;

-- Enable RLS
ALTER TABLE public.technical_assistance ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for now, simplified)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.technical_assistance;
CREATE POLICY "Enable read access for all users" ON public.technical_assistance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.technical_assistance;
CREATE POLICY "Enable insert for all users" ON public.technical_assistance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.technical_assistance;
CREATE POLICY "Enable update for all users" ON public.technical_assistance FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.technical_assistance;
CREATE POLICY "Enable delete for all users" ON public.technical_assistance FOR DELETE USING (true);

-- Seed data (optional, maybe migrate existing?)
-- We will rely on empty start or manual user migration if they want.
