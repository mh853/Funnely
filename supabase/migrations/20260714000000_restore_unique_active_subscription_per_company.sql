-- 회사당 active/trial/past_due 구독은 1건만 허용하는 부분 UNIQUE 인덱스 복원
--
-- 이 제약은 원래 20250131010000_create_subscription_system.sql에서 만들어졌지만,
-- 이후 20251213000012_create_subscription_tables.sql이 company_subscriptions 테이블을
-- DROP 후 재생성하면서 함께 사라졌다. 그 결과 한 회사가 동시에 여러 개의 "살아있는"
-- 구독 행(예: active 2건 + trial 1건)을 갖는 것을 막을 안전장치가 전혀 없었고,
-- 이 상태에서 구독을 취소하면 앱이 "가장 최근에 생성된" 행을 현재 구독으로 오인해
-- 실제로 유효한 유료 구독이 있는데도 화면에는 오래된 체험 구독이 뜨는 문제가 있었다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription_per_company
  ON company_subscriptions(company_id)
  WHERE status IN ('trial', 'active', 'past_due');
