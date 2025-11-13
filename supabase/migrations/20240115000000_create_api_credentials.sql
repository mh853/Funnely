-- Create API credentials table for multi-tenant credential storage
CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'kakao', 'google')),

  -- Encrypted credential storage (JSONB for flexibility)
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one credential set per hospital per platform
  UNIQUE(hospital_id, platform)
);

-- Add RLS policies
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their hospital's credentials
CREATE POLICY "Users can view own hospital credentials"
  ON public.api_credentials
  FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Only hospital owners and admins can insert credentials
CREATE POLICY "Hospital owners and admins can insert credentials"
  ON public.api_credentials
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- Policy: Only hospital owners and admins can update credentials
CREATE POLICY "Hospital owners and admins can update credentials"
  ON public.api_credentials
  FOR UPDATE
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- Policy: Only hospital owners can delete credentials
CREATE POLICY "Hospital owners can delete credentials"
  ON public.api_credentials
  FOR DELETE
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.users
      WHERE id = auth.uid()
      AND role = 'hospital_owner'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_api_credentials_hospital_platform
  ON public.api_credentials(hospital_id, platform);
