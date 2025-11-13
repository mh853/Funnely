-- Fix business_number to be nullable
-- Date: 2025-11-13

-- Remove NOT NULL constraint from business_number
ALTER TABLE hospitals
  ALTER COLUMN business_number DROP NOT NULL;

-- Update existing TEMP business numbers to NULL (optional cleanup)
UPDATE hospitals
SET business_number = NULL
WHERE business_number LIKE 'TEMP-%';

-- Add comment explaining the change
COMMENT ON COLUMN hospitals.business_number IS 'Business registration number - optional, will be set during onboarding';
