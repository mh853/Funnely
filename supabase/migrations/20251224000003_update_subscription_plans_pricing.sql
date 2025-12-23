-- ============================================================================
-- 구독 플랜 가격 및 제한사항 업데이트
-- Created: 2025-12-24
-- ============================================================================

-- max_landing_pages 및 sort_order 컬럼 추가 (존재하지 않는 경우)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans'
    AND column_name = 'max_landing_pages'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN max_landing_pages INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans'
    AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- 기존 플랜 비활성화
UPDATE subscription_plans SET is_active = false;

-- 새로운 플랜 구조로 업데이트
-- 플랜 1: 개인 사용자를 위한 플랜
INSERT INTO subscription_plans (
  name, description,
  price_monthly, price_yearly,
  features, max_users, max_landing_pages,
  is_active, sort_order
) VALUES
(
  '개인 사용자를 위한 플랜',
  '개인 사용자를 위한 플랜',
  19000, 205200,  -- 연간: 17,100원/월 × 12 = 205,200원
  '{
    "dashboard": true,
    "db_status": true
  }'::jsonb,
  1, 1, true, 1
),

-- 플랜 2: 개인 사용자를 위한 플랜 + 스케줄 관리 기능
(
  '개인 사용자를 위한 플랜 + 스케줄 관리 기능',
  '개인 사용자를 위한 플랜 + 스케줄 관리 기능',
  66000, 712800,  -- 연간: 59,400원/월 × 12 = 712,800원
  '{
    "dashboard": true,
    "db_status": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "advanced_schedule": true,
    "analytics": true,
    "reports": true
  }'::jsonb,
  1, 1, true, 2
),

-- 플랜 3: 소규모 기업을 위한 플랜
(
  '소규모 기업을 위한 플랜',
  '소규모 기업을 위한 플랜',
  200000, 2160000,  -- 연간: 180,000원/월 × 12 = 2,160,000원
  '{
    "dashboard": true,
    "db_status": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "advanced_schedule": true,
    "analytics": true,
    "reports": true
  }'::jsonb,
  3, 3, true, 3
),

-- 플랜 4: 성장하는 기업을 위한 플랜
(
  '성장하는 기업을 위한 플랜',
  '성장하는 기업을 위한 플랜',
  490000, 5292000,  -- 연간: 441,000원/월 × 12 = 5,292,000원
  '{
    "dashboard": true,
    "db_status": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "advanced_schedule": true,
    "analytics": true,
    "reports": true,
    "priority_support": true
  }'::jsonb,
  20, 20, true, 4
),

-- 플랜 5: 대규모 조직을 위한 플랜
(
  '대규모 조직을 위한 플랜',
  '대규모 조직을 위한 플랜 - 가격 협의',
  0, 0,  -- 가격 협의
  '{
    "dashboard": true,
    "db_status": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "advanced_schedule": true,
    "analytics": true,
    "reports": true,
    "priority_support": true,
    "customization": true,
    "custom_integration": true
  }'::jsonb,
  NULL, NULL, true, 5  -- 무제한
)
ON CONFLICT DO NOTHING;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort_order
ON subscription_plans(sort_order);

COMMENT ON COLUMN subscription_plans.max_landing_pages IS '최대 랜딩페이지 수 (NULL = 무제한)';
COMMENT ON COLUMN subscription_plans.max_users IS '최대 관리자 수 (NULL = 무제한)';
COMMENT ON COLUMN subscription_plans.sort_order IS '플랜 표시 순서';

SELECT 'Subscription plans pricing updated successfully!' AS status;
