-- Add timer_text column to landing_pages table
-- This column stores customizable text that appears above the timer countdown

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS timer_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN landing_pages.timer_text IS 'Customizable text displayed above the timer countdown (e.g., "특별 할인 마감까지")';
