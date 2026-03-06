-- SQL para criar a tabela de reembolsos no Supabase
-- Execute este script no SQL Editor do seu Dashboard do Supabase

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collaborator_name TEXT NOT NULL,
  date DATE NOT NULL,
  establishment TEXT,
  description TEXT,
  category TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  cnpj TEXT,
  status TEXT DEFAULT '🟡 A PAGAR',
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso (Permitir tudo para usuários autenticados ou conforme sua regra atual)
-- Como o sistema ainda não usa Auth completo em todas as telas, habilitaremos acesso geral por enquanto
DROP POLICY IF EXISTS "Enable all for all users" ON refund_requests;
CREATE POLICY "Enable all for all users" ON refund_requests FOR ALL USING (true);

-- ADICIONAR VINCULO COM OBRA (Usando TEXT para compatibilidade com projects.id)
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS project_id TEXT;

-- ADICIONAR COLUNA PARA AGRUPAMENTO DE BAIXA (RELATORIO FINANCEIRO)
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS settlement_id TEXT;
