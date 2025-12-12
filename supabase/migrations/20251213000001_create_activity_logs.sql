-- Create company activity logs table for admin monitoring
-- Tracks all significant activities across companies for auditing and analysis

CREATE TABLE IF NOT EXISTS company_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Activity information
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'lead_created', 'landing_page_created', 'landing_page_published', 'form_submitted', etc.
  activity_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data (IP, user agent, details, etc.)

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_company_activity_company_date
  ON company_activity_logs(company_id, created_at DESC);

CREATE INDEX idx_company_activity_type
  ON company_activity_logs(activity_type, created_at DESC);

CREATE INDEX idx_company_activity_user
  ON company_activity_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE company_activity_logs IS 'Activity tracking for all companies (for admin monitoring and analytics)';
COMMENT ON COLUMN company_activity_logs.activity_type IS 'Type of activity: login, lead_created, landing_page_created, etc.';
COMMENT ON COLUMN company_activity_logs.metadata IS 'Additional context: IP address, user agent, detailed data, etc.';

-- Enable RLS
ALTER TABLE company_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins can view all activity logs
CREATE POLICY "Super admins can view all activity logs"
  ON company_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- RLS Policy: System can insert activity logs (for automatic tracking)
CREATE POLICY "System can insert activity logs"
  ON company_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
