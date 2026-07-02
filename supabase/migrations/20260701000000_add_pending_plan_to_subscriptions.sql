-- 플랜 변경 예약 컬럼 추가 (다운그레이드 시 다음 결제 주기에 적용)
ALTER TABLE company_subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS pending_billing_cycle TEXT;
