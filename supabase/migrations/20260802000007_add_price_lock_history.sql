-- 가격 그랜드파더링(61차) 잠금이 company_subscriptions에 plan_id당 1개 슬롯만 있어서,
-- 업그레이드 후 환불로 이전 플랜에 되돌아가도 그 플랜의 원래 그랜드파더링 가격을
-- 복원할 방법이 없었다(62차는 null로 비워 안전하게 만들었지만, 63차 QA에서 확인한
-- 것처럼 "복원"은 아니었다 - 카탈로그 최신가로 재잠기는 것뿐). 구독별 plan_id마다
-- 처음 잠긴 가격을 별도로 기록해두면, 이후 그 plan_id로 다시 돌아올 때(환불 롤백
-- 포함) 원래 가격을 정확히 복원할 수 있다.
CREATE TABLE company_subscription_price_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  first_locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, plan_id)
);

COMMENT ON TABLE company_subscription_price_locks IS '구독별 plan_id마다 최초로 잠긴(그랜드파더링) 가격 이력 - 한 번 기록되면 그 plan_id로 돌아올 때 항상 이 값을 재사용한다';

-- 순수 백엔드(엣지함수/서비스롤 API) 전용 부기 테이블 - 클라이언트에 직접 노출할
-- 필요가 없어 RLS만 켜고 별도 정책은 두지 않는다(서비스롤만 접근 가능).
ALTER TABLE company_subscription_price_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_price_locks_subscription_plan ON company_subscription_price_locks(subscription_id, plan_id);

-- 이미 잠긴 구독들의 현재 잠금값을 이력에도 백필한다. 과거에 다른 플랜에 있었을 때의
-- 잠금값까지는 기록해두지 않았어서 복원 불가하지만, 지금 잠긴 값은 앞으로의 조회가
-- 끊기지 않도록 이력에 남긴다.
INSERT INTO company_subscription_price_locks (subscription_id, plan_id, price_monthly, price_yearly)
SELECT id, locked_plan_id, locked_price_monthly, locked_price_yearly
FROM company_subscriptions
WHERE locked_plan_id IS NOT NULL
  AND locked_price_monthly IS NOT NULL
  AND locked_price_yearly IS NOT NULL
ON CONFLICT (subscription_id, plan_id) DO NOTHING;
