-- Create growth_opportunities table if it doesn't exist
-- This is a standalone script to fix the missing table issue

-- 1. growth_opportunities 테이블
CREATE TABLE IF NOT EXISTS growth_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- 기회 유형
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('upsell', 'downsell_risk', 'expansion')),

  -- 현재 상태
  current_plan TEXT NOT NULL,
  recommended_plan TEXT,

  -- 신호 정보
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),

  -- 재무 영향
  estimated_additional_mrr DECIMAL(10,2),
  potential_lost_mrr DECIMAL(10,2),

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'converted', 'dismissed')),
  contacted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  notes TEXT,

  -- 메타데이터
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 같은 회사에 대해 같은 타입의 활성 기회는 하나만
DROP INDEX IF EXISTS idx_growth_opportunities_unique_active;
CREATE UNIQUE INDEX idx_growth_opportunities_unique_active
  ON growth_opportunities(company_id, opportunity_type)
  WHERE status = 'active';

-- 조회 성능을 위한 인덱스
DROP INDEX IF EXISTS idx_growth_opportunities_company;
DROP INDEX IF EXISTS idx_growth_opportunities_status;
DROP INDEX IF EXISTS idx_growth_opportunities_type;
DROP INDEX IF EXISTS idx_growth_opportunities_detected;
DROP INDEX IF EXISTS idx_growth_opportunities_confidence;

CREATE INDEX idx_growth_opportunities_company ON growth_opportunities(company_id);
CREATE INDEX idx_growth_opportunities_status ON growth_opportunities(status);
CREATE INDEX idx_growth_opportunities_type ON growth_opportunities(opportunity_type);
CREATE INDEX idx_growth_opportunities_detected ON growth_opportunities(detected_at DESC);
CREATE INDEX idx_growth_opportunities_confidence ON growth_opportunities(confidence_score DESC);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_growth_opportunities_updated_at ON growth_opportunities;
CREATE TRIGGER update_growth_opportunities_updated_at
  BEFORE UPDATE ON growth_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 설정
ALTER TABLE growth_opportunities ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Super admins can view all growth opportunities" ON growth_opportunities;
DROP POLICY IF EXISTS "Super admins can update growth opportunities" ON growth_opportunities;

-- 관리자만 조회/수정 가능
CREATE POLICY "Super admins can view all growth opportunities"
  ON growth_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
        AND ar.code IN ('super_admin', 'finance')
    )
  );

CREATE POLICY "Super admins can update growth opportunities"
  ON growth_opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
        AND ar.code = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
        AND ar.code = 'super_admin'
    )
  );

-- 2. usage_metrics 테이블 (사용량 추적)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  -- 사용량 데이터
  total_leads INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  total_landing_pages INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,

  -- 활동 지표
  active_days_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  -- 기간
  metric_month DATE NOT NULL, -- 월별 집계 (매월 1일)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, metric_month)
);

DROP INDEX IF EXISTS idx_usage_metrics_company_month;
CREATE INDEX idx_usage_metrics_company_month ON usage_metrics(company_id, metric_month DESC);

-- usage_metrics RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all usage metrics" ON usage_metrics;

-- 관리자 조회 가능
CREATE POLICY "Super admins can view all usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_role_assignments ara
      JOIN admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
        AND ar.code IN ('super_admin', 'finance')
    )
  );

SELECT 'Growth opportunities and usage metrics tables created successfully!' AS status;
