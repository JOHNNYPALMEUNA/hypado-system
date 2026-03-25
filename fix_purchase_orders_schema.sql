-- Migration: Fix purchase_orders column naming (camelCase → snake_case)
-- Applied: 2026-03-25
-- Reason: Original table used camelCase columns; code sends snake_case

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS work_name TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS settlement_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS settlement_date TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Copy existing data from old camelCase columns to new snake_case columns
UPDATE purchase_orders SET project_id = "projectId" WHERE project_id IS NULL;
UPDATE purchase_orders SET work_name = "workName" WHERE work_name IS NULL;
UPDATE purchase_orders SET supplier_id = "supplierId" WHERE supplier_id IS NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
