-- 기존 테이블이 있다면 삭제
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS company_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- 구독 플랜 테이블
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB, -- 플랜별 제공 기능
  max_users INTEGER,
  max_leads INTEGER,
  max_campaigns INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 회사 구독 정보 테이블
CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'trial', 'expired', 'cancelled', 'suspended')),
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 내역 테이블
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES company_subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method VARCHAR(50), -- card, bank_transfer, etc.
  payment_provider VARCHAR(50), -- stripe, toss, etc.
  provider_payment_id VARCHAR(255), -- 결제 제공자의 결제 ID
  description TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB, -- 추가 정보 (카드 마지막 4자리 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 청구서 테이블
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES company_subscriptions(id),
  payment_id UUID REFERENCES payments(id),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'void')),
  due_date TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  line_items JSONB, -- 청구 항목 상세
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용량 추적 테이블 (종량제 또는 제한 체크용)
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- leads, users, api_calls, storage, etc.
  quantity INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX idx_payments_company ON payments(company_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_usage_logs_company ON usage_logs(company_id);
CREATE INDEX idx_usage_logs_period ON usage_logs(period_start, period_end);

-- 기본 구독 플랜 데이터 삽입
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, max_users, max_leads, max_campaigns)
VALUES
  (
    'Free',
    '개인 및 스타트업을 위한 무료 플랜',
    0,
    0,
    '{"basic_analytics": true, "email_support": true, "leads_limit": 100}'::jsonb,
    2,
    100,
    5
  ),
  (
    'Pro',
    '성장하는 팀을 위한 프로 플랜',
    49000,
    490000,
    '{"advanced_analytics": true, "priority_support": true, "custom_reports": true, "api_access": true}'::jsonb,
    10,
    5000,
    50
  ),
  (
    'Enterprise',
    '대규모 조직을 위한 엔터프라이즈 플랜',
    199000,
    1990000,
    '{"enterprise_analytics": true, "dedicated_support": true, "custom_integration": true, "sla": true, "white_label": true}'::jsonb,
    NULL,
    NULL,
    NULL
  );

-- RLS 정책 설정
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Company Owner/Admin은 모든 접근 가능
CREATE POLICY subscription_plans_admin ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY company_subscriptions_admin ON company_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY payments_admin ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY invoices_admin ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY usage_logs_admin ON usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

-- 변경 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Subscription and billing tables created successfully';
END $$;
