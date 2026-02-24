-- 구독 플로우 개선을 위한 스키마 변경
-- 변경사항:
--   1. current_period_end를 nullable로 변경 (Free 플랜은 만료일 없음)
--   2. has_used_trial 컬럼 추가 (체험 이력 추적 - 신규/기존 사용자 분기용)

-- 1. current_period_end nullable 허용
ALTER TABLE company_subscriptions
ALTER COLUMN current_period_end DROP NOT NULL;

-- 2. current_period_start nullable 허용 (Free 플랜 신규 가입 시 즉시 활성화이므로)
ALTER TABLE company_subscriptions
ALTER COLUMN current_period_start DROP NOT NULL;

-- 3. 체험 이력 추적 컬럼 추가
--    True이면 이미 유료 플랜 체험을 사용한 사용자 → 다음 유료 플랜 선택 시 바로 결제
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- 완료 로그
DO $$
BEGIN
  RAISE NOTICE '✅ 구독 플로우 스키마 업데이트 완료:';
  RAISE NOTICE '   - current_period_end: NOT NULL → NULL 허용 (Free 플랜 무기한 지원)';
  RAISE NOTICE '   - current_period_start: NOT NULL → NULL 허용';
  RAISE NOTICE '   - has_used_trial: 체험 이력 추적 컬럼 추가';
END $$;
