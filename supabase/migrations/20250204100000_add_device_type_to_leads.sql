-- Add device_type column to leads table for traffic analysis
-- This tracks whether the lead was submitted from PC or Mobile device

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'unknown';

-- Add index for efficient filtering by device type
CREATE INDEX IF NOT EXISTS idx_leads_device_type ON leads(device_type);

COMMENT ON COLUMN leads.device_type IS 'Device type used for form submission: pc, mobile, tablet, unknown';
