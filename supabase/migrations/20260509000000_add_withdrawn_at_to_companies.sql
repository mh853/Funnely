-- Migration: Add withdrawn_at column to companies table for company withdrawal feature
ALTER TABLE companies ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_withdrawn_at ON companies(withdrawn_at) WHERE withdrawn_at IS NOT NULL;
