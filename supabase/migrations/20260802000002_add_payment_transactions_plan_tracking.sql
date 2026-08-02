-- 환불 API가 payment_transactions.status만 바꿀 뿐 company_subscriptions는 전혀
-- 건드리지 않아서, 업그레이드 차액 결제를 환불해도 고객은 계속 상위 플랜을 이용하고
-- 다음 정기갱신부터 그 가격으로 다시 청구되는 문제가 있었다(58차 QA 확인, High).
-- 환불 시 플랜을 자동으로 되돌리려면 "이 거래가 어떤 플랜에서 어떤 플랜으로의
-- 전환이었는지" 기록이 있어야 하는데, 지금까지 그 기록이 없었다 - 이번 거래부터
-- 추적을 시작한다(과거 거래는 이 값이 null이라 자동 복원 대상에서 제외됨).
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS previous_plan_id UUID REFERENCES subscription_plans(id);

COMMENT ON COLUMN payment_transactions.plan_id IS '이 결제로 적용/유지된 플랜 (업그레이드 차액 청구 시 새 플랜)';
COMMENT ON COLUMN payment_transactions.previous_plan_id IS '이 결제 직전의 플랜 (업그레이드 차액 청구 시에만 설정 - 환불 시 이 플랜으로 자동 복원)';
