-- SQL script to add PCP deadline columns to projects table
-- Run this in your Supabase SQL Editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_deadline_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cutting_deadline_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pre_assembly_deadline_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS installation_deadline_date DATE;

COMMENT ON COLUMN projects.project_deadline_date IS 'Data limite para conclusão do projeto/desenho';
COMMENT ON COLUMN projects.cutting_deadline_date IS 'Data limite de corte das chapas';
COMMENT ON COLUMN projects.pre_assembly_deadline_date IS 'Data limite de pré-montagem na oficina';
COMMENT ON COLUMN projects.installation_deadline_date IS 'Data limite para finalização da instalação/montagem';
