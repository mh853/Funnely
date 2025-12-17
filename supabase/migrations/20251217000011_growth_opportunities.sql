-- Phase 3.4: Growth Opportunities Tables
-- 업셀 기회 및 다운셀 위험 감지 시스템

-- 1. growth_opportunities 테이블
CREATE TABLE growth_opportunities (
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
CREATE UNIQUE INDEX idx_growth_opportunities_unique_active
  ON growth_opportunities(company_id, opportunity_type)
  WHERE status = 'active';

-- 조회 성능을 위한 인덱스
CREATE INDEX idx_growth_opportunities_company ON growth_opportunities(company_id);
CREATE INDEX idx_growth_opportunities_status ON growth_opportunities(status);
CREATE INDEX idx_growth_opportunities_type ON growth_opportunities(opportunity_type);
CREATE INDEX idx_growth_opportunities_detected ON growth_opportunities(detected_at DESC);
CREATE INDEX idx_growth_opportunities_confidence ON growth_opportunities(confidence_score DESC);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_growth_opportunities_updated_at
  BEFORE UPDATE ON growth_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE INDEX idx_usage_metrics_company_month ON usage_metrics(company_id, metric_month DESC);

-- 3. RLS 정책 설정

-- growth_opportunities RLS
ALTER TABLE growth_opportunities ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Super admins can view all growth opportunities"
  ON growth_opportunities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance')
    )
  );

CREATE POLICY "Super admins can update growth opportunities"
  ON growth_opportunities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'super_admin'
    )
  );

-- usage_metrics RLS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- 관리자 조회 가능
CREATE POLICY "Super admins can view all usage metrics"
  ON usage_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('super_admin', 'finance')
    )
  );

-- 4. 샘플 데이터 생성 함수 (테스트용)
CREATE OR REPLACE FUNCTION generate_sample_growth_opportunities()
RETURNS void AS $$
DECLARE
  sample_company_id UUID;
BEGIN
  -- 첫 번째 활성 회사 선택
  SELECT id INTO sample_company_id FROM companies WHERE status = 'active' LIMIT 1;

  IF sample_company_id IS NOT NULL THEN
    -- 업셀 기회 예시
    INSERT INTO growth_opportunities (
      company_id,
      opportunity_type,
      current_plan,
      recommended_plan,
      signals,
      confidence_score,
      estimated_additional_mrr,
      status
    ) VALUES (
      sample_company_id,
      'upsell',
      'Basic',
      'Pro',
      '[
        {
          "type": "usage_limit",
          "resource": "leads",
          "current": 950,
          "limit": 1000,
          "percentage": 95,
          "message": "리드 수 95% 사용 중 (950/1000)"
        },
        {
          "type": "feature_attempt",
          "feature": "API Integration",
          "required_plan": "Pro",
          "attempt_count": 3,
          "message": "API 연동 시도 3회 (Pro 플랜 필요)"
        }
      ]'::jsonb,
      85,
      200.00,
      'active'
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample growth opportunity created for company %', sample_company_id;
  ELSE
    RAISE NOTICE 'No active company found - skipping sample data';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 주석: 샘플 데이터는 필요시 수동으로 실행
-- SELECT generate_sample_growth_opportunities();
