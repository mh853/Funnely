-- company_subscriptions_status_check에 'past_due'가 빠져있어, 결제 실패 시
-- toss-billing-payment 엣지함수가 status를 'past_due'로 전환하려는 UPDATE가
-- 매번 23514(check_violation)로 조용히 거부됐다(코드가 이 UPDATE의 error를
-- 확인하지 않아 예외 없이 그냥 넘어감). 그 결과 결제 실패한 구독이 영원히
-- status='active'로 남아 무제한 이용이 가능해지고, 7일 유예기간 만료 취소
-- 크론(status='past_due' 조건)도 절대 매칭되지 않았다(44차 QA에서 실제 재현
-- 확인 - 운영 DB에 past_due 행이 0건).
--
-- 20251213000012_create_subscription_tables.sql이 기존 테이블을 DROP 후
-- 재생성하면서 과거(20250131010000_create_subscription_system.sql)엔 있던
-- 'past_due'를 빠뜨렸다. 기존 5개 값은 그대로 두고 past_due만 추가한다.

ALTER TABLE company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_status_check;

ALTER TABLE company_subscriptions ADD CONSTRAINT company_subscriptions_status_check
  CHECK (status IN ('active', 'trial', 'expired', 'cancelled', 'suspended', 'past_due'));
