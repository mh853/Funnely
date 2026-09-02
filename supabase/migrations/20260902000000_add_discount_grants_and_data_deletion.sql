-- 노션 32번: 체험/구독 만료 이메일 정비 - 1회성 10% 할인 그랜트 테이블 + 회사 데이터 삭제 플래그

-- 만료 후 2일/1개월 시점 winback 메일에서 발급하는 1회성 할인 코드.
-- 정기갱신에는 영향 없음 - 엣지함수가 이번 결제 청구액에만 곱해서 쓰고, 가격
-- 잠금(company_subscription_price_locks)에는 절대 반영하지 않는다.
CREATE TABLE IF NOT EXISTS discount_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  source TEXT NOT NULL, -- 'trial_winback_2d' | 'trial_winback_1m' | 'sub_winback_2d' | 'sub_winback_1m'
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  redeemed_subscription_id UUID REFERENCES company_subscriptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_grants_token ON discount_grants(token);
CREATE INDEX IF NOT EXISTS idx_discount_grants_company ON discount_grants(company_id);

-- company_subscription_price_locks와 동일하게 서비스롤 전용 부기 테이블 (RLS만 켜고 정책 없음)
ALTER TABLE discount_grants ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE discount_grants IS '만료 winback 이메일에서 발급하는 1회성 할인 코드 - 이번 결제 청구액에만 적용, 가격 그랜드파더링 잠금과 무관';

-- 만료 후 7일 뒤 회사 데이터 삭제 여부를 나타내는 플래그. 테이블마다 deleted_at을
-- 두는 대신 회사 단위 플래그 하나로 관리한다 - 기존 withdrawn_at과 동일한 패턴.
-- NULL이면 정상, 값이 있으면 소프트 삭제된 상태(재구독 시 엣지함수가 NULL로 복원),
-- hardPurgeDeletedCompanyData 크론이 이 값 기준 30일 뒤 실제 DELETE를 수행한다.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS data_deleted_at TIMESTAMPTZ;
