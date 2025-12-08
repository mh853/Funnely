-- Add payment_amount column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12, 0);

-- Add comment for the column
COMMENT ON COLUMN leads.payment_amount IS '결제금액';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_payment_amount ON leads(payment_amount) WHERE payment_amount IS NOT NULL;
