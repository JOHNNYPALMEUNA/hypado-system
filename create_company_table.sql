
-- Create Company Settings Table
create table if not exists company_settings (
  id text primary key default 'main', -- Single row enforcement
  name text not null,
  cnpj text,
  phone text,
  email text,
  address text,
  logo text -- Base64 or URL
);

-- Enable RLS
alter table company_settings enable row level security;

-- Policies
drop policy if exists "Allow all operations for company_settings" on company_settings;
create policy "Allow all operations for company_settings" on company_settings for all to public using (true) with check (true);

-- Enable Realtime
alter publication supabase_realtime add table company_settings;

-- Seed Data (if empty)
insert into company_settings (id, name, cnpj, phone, email, address)
values (
  'main', 
  'Hypado Planejados', 
  '00.000.000/0001-00', 
  '(11) 99999-8888', 
  'contato@hypado.com.br', 
  'Rua da Marcenaria, 123 - Polo Industrial'
)
on conflict (id) do nothing;
