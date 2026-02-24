-- company_subscriptions 테이블에 누락된 컬럼 추가
-- 문제: 20251213000012_create_subscription_tables.sql이 테이블을 재생성하면서
--       토스 페이먼츠 연동 및 체험 관련 컬럼들이 빠짐
-- 영향: 플랜 선택 시 "Could not find the 'customer_key' column of 'company_subscriptions'" 오류 발생

-- 토스 고객키 (빌링키 발급용)
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS customer_key TEXT;

-- 토스 빌링키 (정기결제용)
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS billing_key TEXT;

-- 무료 체험 시작일
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

-- 무료 체험 종료일
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

-- 결제 실패 유예 기간 종료일
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- 취소 사유
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 완료 로그
DO $$
BEGIN
  RAISE NOTICE '✅ company_subscriptions 누락 컬럼 추가 완료:';
  RAISE NOTICE '   - customer_key (토스 고객키)';
  RAISE NOTICE '   - billing_key (토스 빌링키)';
  RAISE NOTICE '   - trial_start_date (체험 시작일)';
  RAISE NOTICE '   - trial_end_date (체험 종료일)';
  RAISE NOTICE '   - grace_period_end (유예 기간 종료일)';
  RAISE NOTICE '   - cancel_reason (취소 사유)';
END $$;
