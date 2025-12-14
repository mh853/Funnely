-- Add background image and color columns to landing_pages table for completion page customization

-- Add completion_bg_image column (stores Supabase Storage public URL)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS completion_bg_image TEXT;

-- Add completion_bg_color column (stores hex color code, default blue)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS completion_bg_color VARCHAR(7) DEFAULT '#5b8def';

-- Add comments for clarity
COMMENT ON COLUMN landing_pages.completion_bg_image IS
'Public URL of background image for completion page (Supabase Storage)';

COMMENT ON COLUMN landing_pages.completion_bg_color IS
'Hex color code for completion page background when no image is set (default: #5b8def)';
