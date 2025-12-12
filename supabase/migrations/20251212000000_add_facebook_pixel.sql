-- Create tracking_pixels table for centralized pixel management
CREATE TABLE IF NOT EXISTS tracking_pixels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Platform specific pixel IDs
  facebook_pixel_id VARCHAR(20),
  google_analytics_id VARCHAR(20),
  google_ads_id VARCHAR(20),
  kakao_pixel_id VARCHAR(20),
  naver_pixel_id VARCHAR(20),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: one tracking pixel config per company
  UNIQUE(company_id)
);

-- Add comments
COMMENT ON TABLE tracking_pixels IS 'Centralized tracking pixel management for companies';
COMMENT ON COLUMN tracking_pixels.facebook_pixel_id IS 'Facebook/Meta Pixel ID';
COMMENT ON COLUMN tracking_pixels.google_analytics_id IS 'Google Analytics 4 Measurement ID (G-XXXXXXXXXX)';
COMMENT ON COLUMN tracking_pixels.google_ads_id IS 'Google Ads Conversion ID (AW-XXXXXXXXXX)';
COMMENT ON COLUMN tracking_pixels.kakao_pixel_id IS 'Kakao Pixel ID';
COMMENT ON COLUMN tracking_pixels.naver_pixel_id IS 'Naver Pixel ID';

-- Add RLS policies
ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's tracking pixels
CREATE POLICY "Users can view their company tracking pixels"
  ON tracking_pixels
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert their company's tracking pixels
CREATE POLICY "Users can insert their company tracking pixels"
  ON tracking_pixels
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update their company's tracking pixels
CREATE POLICY "Users can update their company tracking pixels"
  ON tracking_pixels
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_tracking_pixels_updated_at
  BEFORE UPDATE ON tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
