-- Add sticky position columns for CTA and Call buttons

-- CTA button sticky position
ALTER TABLE landing_pages
ADD COLUMN cta_sticky_position TEXT CHECK (cta_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';

-- Call button sticky position
ALTER TABLE landing_pages
ADD COLUMN call_button_sticky_position TEXT CHECK (call_button_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';

-- Add comments for clarity
COMMENT ON COLUMN landing_pages.cta_sticky_position IS 'CTA button screen fixed position: none, top, or bottom';
COMMENT ON COLUMN landing_pages.call_button_sticky_position IS 'Call button screen fixed position: none, top, or bottom';
