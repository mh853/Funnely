-- Public inquiries table for unauthenticated form submissions from the marketing site
CREATE TABLE IF NOT EXISTS public_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('general', 'sales', 'technical', 'billing')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_public_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_inquiries_updated_at
  BEFORE UPDATE ON public_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_public_inquiries_updated_at();

-- RLS: only service role can insert/read (no public access)
ALTER TABLE public_inquiries ENABLE ROW LEVEL SECURITY;

-- Admins (service role bypasses RLS) can read all rows
CREATE POLICY "service_role_all" ON public_inquiries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
