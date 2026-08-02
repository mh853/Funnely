-- 플랜 가격 그랜드파더링(가격 스냅샷) - subscription_plans.price_monthly/price_yearly를
-- 변경하면 이미 그 플랜을 구독 중인 고객에게도 다음 결제부터 새 가격이 그대로 소급
-- 적용되고 있었다(61차 QA 확인, Medium). 각 구독이 "이 plan_id로 마지막에 실제 청구된
-- 가격"을 스냅샷으로 저장해두고, toss-billing-payment가 매번 subscription_plans를
-- fresh 조회하는 대신 이 스냅샷이 현재 plan_id와 일치하면 그 값을 재사용하도록 한다.
-- plan_id가 바뀌면(업그레이드/다운그레이드/관리자 변경) 스냅샷도 자연히 무효화되어
-- 다음 청구 시점의 가격으로 새로 잠긴다.
ALTER TABLE company_subscriptions
  ADD COLUMN IF NOT EXISTS locked_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS locked_price_monthly DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS locked_price_yearly DECIMAL(10, 2);

COMMENT ON COLUMN company_subscriptions.locked_plan_id IS '가격이 스냅샷된 대상 plan_id - 현재 plan_id와 다르면 스냅샷은 무효(다음 청구 시 재잠금)';
COMMENT ON COLUMN company_subscriptions.locked_price_monthly IS '해당 plan_id로 마지막에 실제 청구된 월간 가격 (그랜드파더링용 스냅샷)';
COMMENT ON COLUMN company_subscriptions.locked_price_yearly IS '해당 plan_id로 마지막에 실제 청구된 연간 가격 (그랜드파더링용 스냅샷)';
