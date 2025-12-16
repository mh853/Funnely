-- Phase 2: Customer Success Management
-- Migration: Health Scores, Onboarding Progress, Feature Usage

-- ===================================================================
-- 1. Health Scores Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Overall score (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Component scores (0-100 each)
  engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
  product_usage_score INTEGER NOT NULL CHECK (product_usage_score >= 0 AND product_usage_score <= 100),
  support_score INTEGER NOT NULL CHECK (support_score >= 0 AND support_score <= 100),
  payment_score INTEGER NOT NULL CHECK (payment_score >= 0 AND payment_score <= 100),

  -- Health status classification
  health_status TEXT NOT NULL CHECK (health_status IN ('critical', 'at_risk', 'healthy', 'excellent')),

  -- Analysis results (JSONB for flexibility)
  risk_factors JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one score per company per day
  UNIQUE(company_id, calculated_at::date)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_health_scores_company_id ON health_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_health_status ON health_scores(health_status);
CREATE INDEX IF NOT EXISTS idx_health_scores_calculated_at ON health_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_scores_overall_score ON health_scores(overall_score DESC);

-- RLS policies
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to health_scores"
  ON health_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- 2. Onboarding Progress Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Current stage
  current_stage TEXT NOT NULL CHECK (current_stage IN (
    'signup',
    'profile_setup',
    'first_landing_page',
    'first_lead',
    'team_invite',
    'completed'
  )),

  -- Stage timestamps
  signup_at TIMESTAMPTZ,
  profile_setup_at TIMESTAMPTZ,
  first_landing_page_at TIMESTAMPTZ,
  first_lead_at TIMESTAMPTZ,
  team_invite_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Progress tracking
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_stalled BOOLEAN NOT NULL DEFAULT false,
  stalled_since TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per company
  UNIQUE(company_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id ON onboarding_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_current_stage ON onboarding_progress(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_is_stalled ON onboarding_progress(is_stalled);

-- RLS policies
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to onboarding_progress"
  ON onboarding_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- 3. Feature Usage Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Feature identification
  feature_name TEXT NOT NULL,
  feature_category TEXT NOT NULL,

  -- Usage metrics
  usage_count INTEGER NOT NULL DEFAULT 0,
  unique_users_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ,

  -- Usage patterns (JSONB for flexibility)
  usage_by_user JSONB DEFAULT '{}'::jsonb,
  usage_trend JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per company per feature
  UNIQUE(company_id, feature_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_usage_company_id ON feature_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_name ON feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_category ON feature_usage(feature_category);
CREATE INDEX IF NOT EXISTS idx_feature_usage_last_used_at ON feature_usage(last_used_at DESC);

-- RLS policies
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to feature_usage"
  ON feature_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- 4. Helper Functions
-- ===================================================================

-- Function to update onboarding progress timestamps
CREATE OR REPLACE FUNCTION update_onboarding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_timestamp();

-- Function to update feature usage timestamps
CREATE OR REPLACE FUNCTION update_feature_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_usage_updated_at
  BEFORE UPDATE ON feature_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_usage_timestamp();

-- ===================================================================
-- 5. Comments for Documentation
-- ===================================================================

COMMENT ON TABLE health_scores IS 'Customer success health scores with multi-factor calculation';
COMMENT ON TABLE onboarding_progress IS 'Company onboarding stage tracking with stall detection';
COMMENT ON TABLE feature_usage IS 'Feature adoption and usage analytics per company';

COMMENT ON COLUMN health_scores.overall_score IS 'Weighted average of all component scores (0-100)';
COMMENT ON COLUMN health_scores.engagement_score IS 'User engagement activity score (35% weight)';
COMMENT ON COLUMN health_scores.product_usage_score IS 'Product feature usage score (30% weight)';
COMMENT ON COLUMN health_scores.support_score IS 'Support ticket health score (20% weight)';
COMMENT ON COLUMN health_scores.payment_score IS 'Payment status health score (15% weight)';
COMMENT ON COLUMN health_scores.risk_factors IS 'Array of identified risk factors with severity';
COMMENT ON COLUMN health_scores.recommendations IS 'Array of actionable recommendations for improvement';

COMMENT ON COLUMN onboarding_progress.current_stage IS 'Current onboarding stage (signup → completed)';
COMMENT ON COLUMN onboarding_progress.completion_percentage IS 'Overall onboarding completion (0-100)';
COMMENT ON COLUMN onboarding_progress.is_stalled IS 'Flag for stalled onboarding (no progress in 7+ days)';

COMMENT ON COLUMN feature_usage.feature_name IS 'Unique feature identifier';
COMMENT ON COLUMN feature_usage.feature_category IS 'Feature category (e.g., landing_pages, leads, analytics)';
COMMENT ON COLUMN feature_usage.usage_by_user IS 'JSON map of user_id → usage_count';
COMMENT ON COLUMN feature_usage.usage_trend IS 'JSON array of daily usage counts for trend analysis';
