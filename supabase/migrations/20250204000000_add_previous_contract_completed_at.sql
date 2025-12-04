-- Add previous_contract_completed_at column to leads table
-- This stores the previous contract completion date when status changes

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS previous_contract_completed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN leads.previous_contract_completed_at IS 'Stores the previous contract completion date when contract_completed_at is updated';
