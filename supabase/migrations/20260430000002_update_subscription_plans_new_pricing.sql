-- Migration: Update subscription plans to match new 5-tier pricing
-- Created: 2026-04-30
-- Description: 홈페이지 가격표(스타터/스타터플러스/프로/프리미엄/커스터마이징)에 맞게
--              subscription_plans 테이블 업데이트. 기존 구독 FK는 유지하며 이름/가격/기능만 변경.

-- ============================================================================
-- 1. 기존 활성 플랜 비활성화 (기존 구독 FK 유지)
-- ============================================================================
UPDATE subscription_plans SET is_active = false WHERE is_active = true;

-- ============================================================================
-- 2. 새 5개 플랜 삽입
-- ============================================================================
INSERT INTO subscription_plans (
  name, description,
  price_monthly, price_yearly,
  features,
  max_users, max_landing_pages,
  is_active, sort_order
) VALUES

-- 플랜 1: 스타터
(
  '스타터',
  '1인 사업자 및 개인을 위한 입문 플랜',
  19000, 205200,
  '{
    "db_report": true,
    "dashboard": true,
    "traffic_analytics": true,
    "blacklist_management": true,
    "ad_pixel_api": true,
    "email_notification": false,
    "db_schedule": false,
    "reservation_schedule": false,
    "db_auto_assign": false,
    "customization": false,
    "custom_domain": false
  }'::jsonb,
  1, 1,
  true, 1
),

-- 플랜 2: 스타터 플러스
(
  '스타터 플러스',
  '1인 사업자 및 개인을 위한 이메일 알림 포함 플랜',
  49000, 529200,
  '{
    "db_report": true,
    "dashboard": true,
    "traffic_analytics": true,
    "blacklist_management": true,
    "ad_pixel_api": true,
    "email_notification": true,
    "db_schedule": false,
    "reservation_schedule": false,
    "db_auto_assign": false,
    "customization": false,
    "custom_domain": false
  }'::jsonb,
  1, 3,
  true, 2
),

-- 플랜 3: 프로 (7일 무료체험)
(
  '프로',
  '스타트업, 소규모 사업자를 위한 플랜',
  290000, 3132000,
  '{
    "db_report": true,
    "dashboard": true,
    "traffic_analytics": true,
    "blacklist_management": true,
    "ad_pixel_api": true,
    "email_notification": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "db_auto_assign": false,
    "customization": false,
    "custom_domain": false,
    "trial_days": 7
  }'::jsonb,
  10, 10,
  true, 3
),

-- 플랜 4: 프리미엄 (기업 추천)
(
  '프리미엄',
  '기업 및 팀 조직을 위한 플랜',
  490000, 5292000,
  '{
    "db_report": true,
    "dashboard": true,
    "traffic_analytics": true,
    "blacklist_management": true,
    "ad_pixel_api": true,
    "email_notification": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "db_auto_assign": true,
    "customization": false,
    "custom_domain": true
  }'::jsonb,
  NULL, NULL,
  true, 4
),

-- 플랜 5: 커스터마이징 (협의)
(
  '커스터마이징',
  '맞춤형 개발이 필요한 기업을 위한 플랜 (가격 협의)',
  0, 0,
  '{
    "db_report": true,
    "dashboard": true,
    "traffic_analytics": true,
    "blacklist_management": true,
    "ad_pixel_api": true,
    "email_notification": true,
    "db_schedule": true,
    "reservation_schedule": true,
    "db_auto_assign": true,
    "customization": true,
    "custom_domain": true
  }'::jsonb,
  NULL, NULL,
  true, 5
);

-- ============================================================================
-- 3. 기존 구독자 호환성: 이전 고가 플랜에 custom_domain 활성화
--    (company_subscriptions FK가 이전 plan_id를 가리키는 경우 대비)
-- ============================================================================
UPDATE subscription_plans
SET features = features || '{"custom_domain": true}'::jsonb
WHERE is_active = false
  AND (
    name IN (
      '성장하는 기업을 위한 플랜',
      '대규모 조직을 위한 플랜',
      'Enterprise',
      '소규모 기업을 위한 플랜'
    )
    OR (price_monthly >= 200000 AND price_monthly < 999999)
    OR (price_monthly = 0 AND name NOT ILIKE '%free%' AND name NOT ILIKE '무료%')
  );

SELECT '✅ Subscription plans updated to new 5-tier pricing' AS status;
