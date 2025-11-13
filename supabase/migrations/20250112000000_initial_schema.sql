-- Initial Schema for MediSync
-- Created: 2025-11-12

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enums
CREATE TYPE user_role AS ENUM (
  'hospital_owner',
  'hospital_admin',
  'marketing_manager',
  'marketing_staff',
  'viewer'
);

CREATE TYPE ad_platform AS ENUM (
  'meta',
  'kakao',
  'google'
);

CREATE TYPE campaign_status AS ENUM (
  'active',
  'paused',
  'ended',
  'draft'
);

CREATE TYPE budget_type AS ENUM (
  'daily',
  'lifetime'
);

-- ============================================================================
-- HOSPITALS TABLE
-- ============================================================================
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_number TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hospitals_business_number ON hospitals(business_number);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_users_hospital_id ON users(hospital_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- AD ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, platform, account_id)
);

CREATE INDEX idx_ad_accounts_hospital_id ON ad_accounts(hospital_id);
CREATE INDEX idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX idx_ad_accounts_is_active ON ad_accounts(is_active);

-- ============================================================================
-- CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  objective TEXT,
  budget NUMERIC(15, 2),
  budget_type budget_type,
  start_date DATE,
  end_date DATE,
  targeting JSONB,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_account_id, platform_campaign_id)
);

CREATE INDEX idx_campaigns_ad_account_id ON campaigns(ad_account_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);

-- ============================================================================
-- CAMPAIGN METRICS TABLE
-- ============================================================================
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(15, 2) DEFAULT 0,
  ctr NUMERIC(5, 2),
  cpc NUMERIC(10, 2),
  cpa NUMERIC(10, 2),
  roas NUMERIC(10, 2),
  reach BIGINT,
  frequency NUMERIC(5, 2),
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

CREATE INDEX idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date DESC);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- SAVED REPORTS TABLE
-- ============================================================================
CREATE TABLE saved_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  schedule JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_hospital_id ON saved_reports(hospital_id);
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_is_active ON saved_reports(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- HOSPITALS POLICIES
CREATE POLICY "Users can view their own hospital"
  ON hospitals FOR SELECT
  USING (
    id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Hospital owners can update their hospital"
  ON hospitals FOR UPDATE
  USING (
    id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid() AND role = 'hospital_owner'
    )
  );

-- USERS POLICIES
CREATE POLICY "Users can view users in their hospital"
  ON users FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );

-- AD ACCOUNTS POLICIES
CREATE POLICY "Users can view ad accounts in their hospital"
  ON ad_accounts FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage ad accounts"
  ON ad_accounts FOR ALL
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- CAMPAIGNS POLICIES
CREATE POLICY "Users can view campaigns in their hospital"
  ON campaigns FOR SELECT
  USING (
    ad_account_id IN (
      SELECT id FROM ad_accounts
      WHERE hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can manage campaigns"
  ON campaigns FOR ALL
  USING (
    ad_account_id IN (
      SELECT id FROM ad_accounts
      WHERE hospital_id IN (
        SELECT hospital_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
      )
    )
  );

-- CAMPAIGN METRICS POLICIES
CREATE POLICY "Users can view metrics in their hospital"
  ON campaign_metrics FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE aa.hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );

-- SAVED REPORTS POLICIES
CREATE POLICY "Users can view reports in their hospital"
  ON saved_reports FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own reports"
  ON saved_reports FOR ALL
  USING (
    created_by = auth.uid()
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_accounts_updated_at BEFORE UPDATE ON ad_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at BEFORE UPDATE ON saved_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hospitals IS '병원 조직 정보';
COMMENT ON TABLE users IS '사용자 계정';
COMMENT ON TABLE ad_accounts IS '광고 플랫폼 계정 연동 정보';
COMMENT ON TABLE campaigns IS '광고 캠페인';
COMMENT ON TABLE campaign_metrics IS '캠페인 일별 성과 데이터';
COMMENT ON TABLE audit_logs IS '감사 로그';
COMMENT ON TABLE saved_reports IS '저장된 리포트';
