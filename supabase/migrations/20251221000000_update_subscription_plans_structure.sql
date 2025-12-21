-- ============================================================================
-- 구독 플랜 구조 업데이트: 개인/기업 × Free/Basic/Pro
-- Created: 2025-12-21
-- ============================================================================

-- 1. user_type과 tier 컬럼 추가
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS user_type TEXT,
ADD COLUMN IF NOT EXISTS tier TEXT;

-- 2. 기존 데이터 정리 - 모든 플랜을 비활성화
UPDATE subscription_plans SET is_active = false;

-- 3. 새로운 플랜 구조로 데이터 삽입
-- 개인 플랜 (Personal)
INSERT INTO subscription_plans (
  user_type, tier, name, description,
  price_monthly, price_yearly,
  features, max_users, max_leads, max_campaigns,
  is_active
) VALUES
-- 개인 Free
(
  'personal', 'free', 'Personal Free',
  '개인 사용자를 위한 무료 플랜',
  0, 0,
  '{"basic_analytics": true, "email_support": true}'::jsonb,
  1, 50, 3, true
),
-- 개인 Basic
(
  'personal', 'basic', 'Personal Basic',
  '개인 전문가를 위한 기본 플랜',
  15900, 159000,
  '{"basic_analytics": true, "advanced_analytics": true, "email_support": true, "landing_pages": 10}'::jsonb,
  1, 500, 10, true
),
-- 개인 Pro
(
  'personal', 'pro', 'Personal Pro',
  '파워 유저를 위한 전문가 플랜',
  39900, 399000,
  '{"basic_analytics": true, "advanced_analytics": true, "priority_support": true, "custom_reports": true, "api_access": true, "landing_pages": 30}'::jsonb,
  3, 2000, 30, true
),

-- 기업 플랜 (Business)
-- 기업 Free
(
  'business', 'free', 'Business Free',
  '소규모 팀을 위한 무료 플랜',
  0, 0,
  '{"basic_analytics": true, "email_support": true, "team_collaboration": true}'::jsonb,
  3, 100, 5, true
),
-- 기업 Basic
(
  'business', 'basic', 'Business Basic',
  '성장하는 팀을 위한 기본 플랜',
  49900, 499000,
  '{"basic_analytics": true, "advanced_analytics": true, "priority_support": true, "team_collaboration": true, "landing_pages": 20}'::jsonb,
  10, 1000, 20, true
),
-- 기업 Pro
(
  'business', 'pro', 'Business Pro',
  '대규모 조직을 위한 엔터프라이즈 플랜',
  149900, 1499000,
  '{"basic_analytics": true, "advanced_analytics": true, "priority_support": true, "dedicated_support": true, "custom_integration": true, "white_label": true, "api_access": true, "landing_pages": null}'::jsonb,
  NULL, NULL, NULL, true
)
ON CONFLICT DO NOTHING;

-- 4. 제약 조건 추가
ALTER TABLE subscription_plans
ADD CONSTRAINT check_user_type CHECK (user_type IN ('personal', 'business')),
ADD CONSTRAINT check_tier CHECK (tier IN ('free', 'basic', 'pro'));

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type_tier
ON subscription_plans(user_type, tier);

-- 6. plan_type 컬럼 제거 (더 이상 사용하지 않음)
-- 주의: 기존 company_subscriptions와의 참조를 확인 후 실행
-- ALTER TABLE subscription_plans DROP COLUMN IF EXISTS plan_type;

COMMENT ON COLUMN subscription_plans.user_type IS '사용자 유형: personal(개인), business(기업)';
COMMENT ON COLUMN subscription_plans.tier IS '플랜 등급: free(무료), basic(기본), pro(프로)';

SELECT 'Subscription plans structure updated successfully!' AS status;
