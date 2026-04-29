-- ============================================================
-- 커스텀 도메인 기능 추가
-- 회사별 커스텀 도메인 및 랜딩페이지별 도메인 오버라이드 지원
-- ============================================================

-- 1. company_custom_domains 테이블 생성
CREATE TABLE IF NOT EXISTS company_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 도메인 정보
  domain TEXT NOT NULL,
  is_company_default BOOLEAN DEFAULT FALSE,

  -- 소유권 인증
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verified_at TIMESTAMPTZ,
  last_verification_attempt_at TIMESTAMPTZ,
  verification_error TEXT,

  -- Vercel 등록 상태
  vercel_registered BOOLEAN DEFAULT FALSE,
  vercel_registered_at TIMESTAMPTZ,
  vercel_config_type TEXT CHECK (vercel_config_type IN ('cname', 'a_record')),

  -- SSL 상태
  ssl_status TEXT DEFAULT 'pending'
    CHECK (ssl_status IN ('pending', 'active', 'error')),
  ssl_checked_at TIMESTAMPTZ,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 도메인은 전체 시스템에서 유일
  CONSTRAINT company_custom_domains_domain_unique UNIQUE (domain)
);

-- 2. 회사당 기본 도메인은 인증된 것 중 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_default_domain
  ON company_custom_domains(company_id)
  WHERE is_company_default = TRUE AND verification_status = 'verified';

-- 3. company_id 조회 성능
CREATE INDEX IF NOT EXISTS idx_company_custom_domains_company_id
  ON company_custom_domains(company_id);

-- 4. 도메인 조회 성능 (middleware에서 사용)
CREATE INDEX IF NOT EXISTS idx_company_custom_domains_domain
  ON company_custom_domains(domain)
  WHERE verification_status = 'verified';

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_company_custom_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_custom_domains_updated_at
  BEFORE UPDATE ON company_custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_company_custom_domains_updated_at();

-- 6. landing_pages 테이블에 커스텀 도메인 오버라이드 컬럼 추가
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS custom_domain_id UUID
    REFERENCES company_custom_domains(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_landing_pages_custom_domain_id
  ON landing_pages(custom_domain_id)
  WHERE custom_domain_id IS NOT NULL;

-- 7. subscription_plans features에 custom_domain 추가
-- 소규모 기업을 위한 플랜 이상에만 true 설정
UPDATE subscription_plans
SET features = features || '{"custom_domain": true}'::jsonb
WHERE name IN (
  '소규모 기업을 위한 플랜',
  '성장하는 기업을 위한 플랜',
  '대규모 조직을 위한 플랜'
);

-- 8. RLS 정책
ALTER TABLE company_custom_domains ENABLE ROW LEVEL SECURITY;

-- 회사 멤버는 자신의 회사 도메인 관리 가능
CREATE POLICY "company_members_manage_custom_domains"
  ON company_custom_domains
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role은 모든 도메인 조회 가능 (middleware에서 사용)
CREATE POLICY "service_role_read_custom_domains"
  ON company_custom_domains
  FOR SELECT
  USING (auth.role() = 'service_role');
