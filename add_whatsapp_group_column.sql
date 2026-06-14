-- Script de migração para adicionar coluna de identificador de grupo do WhatsApp
ALTER TABLE projects ADD COLUMN IF NOT EXISTS whatsapp_group_jid text;
