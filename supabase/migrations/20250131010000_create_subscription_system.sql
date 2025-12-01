-- ============================================================================
-- 구독 결제 시스템 DB 스키마
-- Created: 2025-01-31
-- Purpose: Toss Payments 기반 구독 결제 시스템
-- ============================================================================

-- ============================================================================
-- STEP 1: subscription_plans 테이블 (구독 플랜)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 플랜 기본 정보
  plan_name TEXT NOT NULL, -- 'basic', 'pro', 'enterprise'
  display_name TEXT NOT NULL, -- '베이직', '프로', '엔터프라이즈'
  description TEXT,

  -- 가격 정보
  monthly_price INTEGER NOT NULL, -- 월간 가격 (원)
  yearly_price INTEGER NOT NULL, -- 연간 가격 (원)

  -- 플랜 기능
  features JSONB DEFAULT '[]', -- 플랜별 기능 목록

  -- 제한 사항
  max_landing_pages INTEGER, -- 최대 랜딩 페이지 수
  max_leads INTEGER, -- 최대 리드 수
  max_team_members INTEGER, -- 최대 팀원 수

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_name ON subscription_plans(plan_name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);

COMMENT ON TABLE subscription_plans IS '구독 플랜 정의';

-- 기본 플랜 데이터 삽입
INSERT INTO subscription_plans (plan_name, display_name, description, monthly_price, yearly_price, features, max_landing_pages, max_leads, max_team_members, display_order)
VALUES
  ('basic', '베이직', '개인 또는 소규모 팀을 위한 기본 플랜', 29000, 290000,
   '["랜딩 페이지 3개", "월 리드 100개", "팀원 2명", "기본 분석"]'::jsonb,
   3, 100, 2, 1),
  ('pro', '프로', '성장하는 비즈니스를 위한 전문가 플랜', 99000, 990000,
   '["랜딩 페이지 무제한", "월 리드 1,000개", "팀원 10명", "고급 분석", "A/B 테스트"]'::jsonb,
   NULL, 1000, 10, 2),
  ('enterprise', '엔터프라이즈', '대규모 조직을 위한 맞춤형 플랜', 299000, 2990000,
   '["랜딩 페이지 무제한", "월 리드 무제한", "팀원 무제한", "전담 지원", "커스텀 통합", "SLA 보장"]'::jsonb,
   NULL, NULL, NULL, 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: company_subscriptions 테이블 (회사별 구독)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- 구독 상태
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'canceled', 'expired'

  -- 결제 주기
  billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'

  -- 무료 체험
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,

  -- 구독 기간
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- 결제 실패 유예
  grace_period_end TIMESTAMPTZ, -- 결제 실패 시 7일 유예 기간

  -- 취소 정보
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 토스 페이먼츠 정보
  billing_key TEXT, -- 토스 빌링키 (정기결제용)
  customer_key TEXT, -- 토스 고객키

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 부분 UNIQUE 인덱스: 활성 구독은 회사당 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_subscription_per_company
  ON company_subscriptions(company_id)
  WHERE status IN ('trial', 'active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_billing_key ON company_subscriptions(billing_key);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_period_end ON company_subscriptions(current_period_end);

COMMENT ON TABLE company_subscriptions IS '회사별 구독 정보';
COMMENT ON COLUMN company_subscriptions.status IS '구독 상태: trial(체험), active(활성), past_due(결제지연), canceled(취소), expired(만료)';
COMMENT ON COLUMN company_subscriptions.billing_cycle IS '결제 주기: monthly(월간), yearly(연간)';

-- ============================================================================
-- STEP 3: payment_transactions 테이블 (결제 거래 내역)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES company_subscriptions(id) ON DELETE SET NULL,

  -- 결제 기본 정보
  order_id TEXT UNIQUE NOT NULL, -- 주문 ID (고유값)
  payment_key TEXT, -- 토스 결제 키

  -- 결제 금액
  amount INTEGER NOT NULL, -- 결제 금액 (원)
  vat INTEGER, -- 부가세
  total_amount INTEGER NOT NULL, -- 총 결제 금액

  -- 결제 수단
  payment_method TEXT NOT NULL, -- 'card', 'transfer', 'virtual_account'
  payment_method_detail JSONB, -- 결제 수단 상세 정보 (카드사, 계좌번호 등)

  -- 결제 상태
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'canceled', 'refunded'

  -- 결제 시각
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- 실패/취소 정보
  failure_code TEXT,
  failure_message TEXT,
  cancel_reason TEXT,

  -- 영수증 정보 (토스에서 제공)
  receipt_url TEXT, -- 영수증 URL
  receipt_data JSONB, -- 영수증 상세 데이터

  -- 세금계산서
  tax_invoice_requested BOOLEAN DEFAULT FALSE,
  tax_invoice_issued_at TIMESTAMPTZ,
  tax_invoice_data JSONB, -- 세금계산서 데이터

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_company_id ON payment_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_key ON payment_transactions(payment_key);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

COMMENT ON TABLE payment_transactions IS '결제 거래 내역';
COMMENT ON COLUMN payment_transactions.payment_method IS '결제 수단: card(신용카드), transfer(계좌이체), virtual_account(가상계좌)';
COMMENT ON COLUMN payment_transactions.status IS '결제 상태: pending(대기), success(성공), failed(실패), canceled(취소), refunded(환불)';

-- ============================================================================
-- STEP 4: payment_notifications 테이블 (결제 알림 로그)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,

  -- 알림 정보
  notification_type TEXT NOT NULL, -- 'payment_success', 'payment_failed', 'trial_ending', 'subscription_canceled', 'subscription_renewed'
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- 이메일 내용
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,

  -- 발송 상태
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- 메타데이터
  metadata JSONB, -- 추가 정보 (플랜명, 금액 등)

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_company_id ON payment_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_transaction_id ON payment_notifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_status ON payment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_created_at ON payment_notifications(created_at DESC);

COMMENT ON TABLE payment_notifications IS '결제 관련 알림 로그';
COMMENT ON COLUMN payment_notifications.notification_type IS '알림 유형: payment_success, payment_failed, trial_ending, subscription_canceled, subscription_renewed';

-- ============================================================================
-- STEP 5: RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION PLANS (모든 사용자 조회 가능)
DO $$ BEGIN
  CREATE POLICY "Anyone can view active subscription plans"
    ON subscription_plans FOR SELECT
    USING (is_active = TRUE);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- COMPANY SUBSCRIPTIONS (회사 관련자만 조회)
DO $$ BEGIN
  CREATE POLICY "Users can view their company subscription"
    ON company_subscriptions FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage their company subscription"
    ON company_subscriptions FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PAYMENT TRANSACTIONS (회사 관련자만 조회)
DO $$ BEGIN
  CREATE POLICY "Users can view their company payment transactions"
    ON payment_transactions FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PAYMENT NOTIFICATIONS (회사 관련자만 조회)
DO $$ BEGIN
  CREATE POLICY "Users can view their company payment notifications"
    ON payment_notifications FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 6: Helper Functions
-- ============================================================================

-- 구독 상태 업데이트 함수
CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DO $$ BEGIN
  CREATE TRIGGER update_company_subscriptions_updated_at
    BEFORE UPDATE ON company_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_status();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_status();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 7: 데이터 검증 제약조건
-- ============================================================================

-- 구독 상태 체크
ALTER TABLE company_subscriptions
  ADD CONSTRAINT check_subscription_status
  CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired'));

-- 결제 주기 체크
ALTER TABLE company_subscriptions
  ADD CONSTRAINT check_billing_cycle
  CHECK (billing_cycle IN ('monthly', 'yearly'));

-- 결제 수단 체크
ALTER TABLE payment_transactions
  ADD CONSTRAINT check_payment_method
  CHECK (payment_method IN ('card', 'transfer', 'virtual_account'));

-- 결제 상태 체크
ALTER TABLE payment_transactions
  ADD CONSTRAINT check_payment_status
  CHECK (status IN ('pending', 'success', 'failed', 'canceled', 'refunded'));

-- 알림 상태 체크
ALTER TABLE payment_notifications
  ADD CONSTRAINT check_notification_status
  CHECK (status IN ('pending', 'sent', 'failed'));
