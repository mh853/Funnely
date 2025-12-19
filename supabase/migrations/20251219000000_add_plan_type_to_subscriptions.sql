-- 구독 플랜에 개인/기업 구분 추가
-- 기존: Free, Pro, Enterprise (3개 플랜)
-- 신규: 개인(Free, Starter, Pro) + 기업(Free, Starter, Enterprise) (6개 플랜)

-- 1. subscription_plans 테이블에 plan_type 컬럼 추가
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) NOT NULL DEFAULT 'individual'
CHECK (plan_type IN ('individual', 'business'));

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type_active ON subscription_plans(plan_type, is_active);

-- 2. 기존 플랜 비활성화 (데이터는 보존)
UPDATE subscription_plans SET is_active = false WHERE plan_type = 'individual';

-- 3. 신규 개인 플랜 데이터 삽입
INSERT INTO subscription_plans (name, description, plan_type, price_monthly, price_yearly, features, max_users, max_leads, max_campaigns, is_active)
VALUES
  -- 개인 Free
  (
    'Free',
    '개인 사용자를 위한 무료 플랜',
    'individual',
    0,
    0,
    '{
      "basic_analytics": true,
      "email_support": true
    }'::jsonb,
    1,
    50,
    3,
    true
  ),
  -- 개인 Starter
  (
    'Starter',
    '개인 전문가를 위한 시작 플랜',
    'individual',
    15900,
    159000,
    '{
      "basic_analytics": true,
      "advanced_analytics": true,
      "email_support": true,
      "priority_support": false
    }'::jsonb,
    1,
    500,
    10,
    true
  ),
  -- 개인 Pro
  (
    'Pro',
    '개인 파워 유저를 위한 프로 플랜',
    'individual',
    35900,
    359000,
    '{
      "basic_analytics": true,
      "advanced_analytics": true,
      "email_support": true,
      "priority_support": true,
      "custom_reports": true,
      "api_access": true
    }'::jsonb,
    3,
    2000,
    30,
    true
  );

-- 4. 신규 기업 플랜 데이터 삽입
INSERT INTO subscription_plans (name, description, plan_type, price_monthly, price_yearly, features, max_users, max_leads, max_campaigns, is_active)
VALUES
  -- 기업 Free
  (
    'Free',
    '소규모 팀을 위한 무료 플랜',
    'business',
    0,
    0,
    '{
      "basic_analytics": true,
      "email_support": true
    }'::jsonb,
    3,
    100,
    5,
    true
  ),
  -- 기업 Starter
  (
    'Starter',
    '성장하는 팀을 위한 시작 플랜',
    'business',
    159000,
    1590000,
    '{
      "basic_analytics": true,
      "advanced_analytics": true,
      "email_support": true,
      "priority_support": true,
      "custom_reports": true,
      "api_access": true,
      "team_collaboration": true
    }'::jsonb,
    5,
    5000,
    50,
    true
  ),
  -- 기업 Enterprise
  (
    'Enterprise',
    '대규모 조직을 위한 엔터프라이즈 플랜',
    'business',
    259000,
    2590000,
    '{
      "basic_analytics": true,
      "advanced_analytics": true,
      "enterprise_analytics": true,
      "email_support": true,
      "priority_support": true,
      "dedicated_support": true,
      "custom_reports": true,
      "api_access": true,
      "team_collaboration": true,
      "custom_integration": true,
      "sla": true,
      "white_label": true
    }'::jsonb,
    10,
    NULL,
    NULL,
    true
  );

-- 5. 기존 구독 사용자 마이그레이션 (선택사항)
-- 기존 Pro 구독자를 개인 Pro로 매핑하려면 아래 주석 해제
/*
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND plan_type = 'individual' AND is_active = true
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Pro' AND (plan_type IS NULL OR plan_type = 'individual') AND is_active = false
);
*/

-- 6. 기존 Enterprise 구독자를 기업 Enterprise로 매핑하려면 아래 주석 해제
/*
UPDATE company_subscriptions cs
SET plan_id = (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND plan_type = 'business' AND is_active = true
  LIMIT 1
)
WHERE cs.plan_id IN (
  SELECT id FROM subscription_plans
  WHERE name = 'Enterprise' AND (plan_type IS NULL OR plan_type = 'individual') AND is_active = false
);
*/

-- 완료 로그
DO $$
DECLARE
  individual_count INT;
  business_count INT;
BEGIN
  SELECT COUNT(*) INTO individual_count FROM subscription_plans WHERE plan_type = 'individual' AND is_active = true;
  SELECT COUNT(*) INTO business_count FROM subscription_plans WHERE plan_type = 'business' AND is_active = true;

  RAISE NOTICE '✅ Subscription plans migration completed:';
  RAISE NOTICE '   - Individual plans: %', individual_count;
  RAISE NOTICE '   - Business plans: %', business_count;
  RAISE NOTICE '   - Total active plans: %', individual_count + business_count;
END $$;
