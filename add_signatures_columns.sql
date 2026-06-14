-- Script de migração para adicionar colunas de assinaturas digitais e caderno técnico
ALTER TABLE projects ADD COLUMN IF NOT EXISTS signatures jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caderno_tecnico_url text;
