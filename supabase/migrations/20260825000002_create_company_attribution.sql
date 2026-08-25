-- ============================================================================
-- Company Attribution Table
-- Created: 2026-08-25
-- Description: 신규가입 유입 경로(UTM/광고 클릭 ID) 최초/마지막 터치 기록 (Notion 31번 항목)
-- user_id가 아닌 company_id로 키잉한다 - 매출/구독 데이터(company_subscriptions,
-- payment_transactions)가 전부 company_id 기준이라 마케팅 성과를 이 값들과 조인하려면
-- company_id가 유일하게 쓸모 있는 키다. 회사당 가입은 1회이므로 1:1로 충분하다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,
  first_utm_content TEXT,
  first_utm_term TEXT,
  first_gclid TEXT,
  first_fbclid TEXT,
  first_msclkid TEXT,
  first_gbraid TEXT,
  first_wbraid TEXT,
  first_landing_page TEXT,
  first_referrer TEXT,
  first_touch_at TIMESTAMPTZ,

  last_utm_source TEXT,
  last_utm_medium TEXT,
  last_utm_campaign TEXT,
  last_utm_content TEXT,
  last_utm_term TEXT,
  last_gclid TEXT,
  last_fbclid TEXT,
  last_msclkid TEXT,
  last_gbraid TEXT,
  last_wbraid TEXT,
  last_touch_at TIMESTAMPTZ,

  signup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signup_plan TEXT,
  trial BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_attribution_first_utm_source ON company_attribution(first_utm_source);
CREATE INDEX IF NOT EXISTS idx_company_attribution_last_utm_source ON company_attribution(last_utm_source);
CREATE INDEX IF NOT EXISTS idx_company_attribution_signup_date ON company_attribution(signup_date DESC);

ALTER TABLE company_attribution ENABLE ROW LEVEL SECURITY;

-- 정책 없음(서비스 롤 전용) - 고객사에 노출되는 데이터가 아닌 내부 마케팅 분석용
-- 원천 데이터라 audit_logs류와 달리 회사 단위 SELECT 정책도 두지 않는다. 조회 화면이
-- 필요해지면 그때 관리자 전용 정책을 별도로 추가한다.

COMMENT ON TABLE company_attribution IS '신규가입 유입 경로(UTM/광고 클릭 ID) 최초/마지막 터치 기록 - 내부 마케팅 분석용, 서비스 롤 전용';
COMMENT ON COLUMN company_attribution.company_id IS '회사 ID (FK, 1:1)';
COMMENT ON COLUMN company_attribution.first_touch_at IS '최초 방문 시각 (클라이언트 localStorage 기록 기준)';
COMMENT ON COLUMN company_attribution.last_touch_at IS '마지막 비직접(캠페인 파라미터 있는) 방문 시각';
COMMENT ON COLUMN company_attribution.signup_date IS '가입 완료 시각 (서버 생성값, 클라이언트 값 신뢰 안 함)';
COMMENT ON COLUMN company_attribution.signup_plan IS '가입 시점 확정 플랜 slug (예: starter, pro) - 이후 플랜 변경은 반영 안 됨, 최신 플랜은 company_subscriptions 조인 필요';
COMMENT ON COLUMN company_attribution.trial IS '가입 시점에 체험이 즉시 시작됐는지 여부';
