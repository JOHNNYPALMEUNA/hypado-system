-- ADD COLUMNS TO CLIENTS TABLE FOR NEW CRM & REGISTRATION FORM
-- Execute this script in your Supabase SQL Editor (https://supabase.com)

ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS send_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS store_name TEXT DEFAULT 'Hypado Planejados';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS quadra TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lote TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Notify the database that we updated the structure
COMMENT ON TABLE clients IS 'Tabela de clientes com dados de contato, procedência de lead e endereço detalhado';
