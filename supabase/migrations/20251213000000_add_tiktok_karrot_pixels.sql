-- Add TikTok and Karrot Market pixel columns to tracking_pixels table
ALTER TABLE tracking_pixels
ADD COLUMN IF NOT EXISTS tiktok_pixel_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS karrot_pixel_id VARCHAR(20);

-- Add comments
COMMENT ON COLUMN tracking_pixels.tiktok_pixel_id IS 'TikTok Pixel ID';
COMMENT ON COLUMN tracking_pixels.karrot_pixel_id IS 'Karrot Market (당근마켓) Pixel ID';
