-- SCRIPT PARA CRIAR A TABELA DE EVENTOS (LOGS)
-- Execute isso no SQL Editor do Supabase primeiro

CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  related_id text NOT NULL,
  related_type text NOT NULL, -- PROJECT, DAILY_LOG, PURCHASE_ORDER, TASK
  event_type text NOT NULL,   -- STATUS_CHANGE, CREATED, UPDATED, COMMENT
  old_value text,
  new_value text,
  user_id uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para usuários autenticados
CREATE POLICY "Auth Access Timeline Events" ON timeline_events 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_events;
