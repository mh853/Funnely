-- ============================================================================
-- 리드 결제 내역 테이블 생성
-- 여러 번의 결제를 기록하고 각 결제에 비고를 추가할 수 있도록 함
-- Created: 2025-02-17
-- ============================================================================

-- ============================================================================
-- STEP 1: lead_payments 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- STEP 2: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lead_payments_lead_id ON lead_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_payments_company_id ON lead_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_payments_payment_date ON lead_payments(payment_date);

-- ============================================================================
-- STEP 3: RLS 정책
-- ============================================================================

ALTER TABLE lead_payments ENABLE ROW LEVEL SECURITY;

-- 같은 회사의 사용자만 조회 가능
CREATE POLICY "Users can view own company payments"
  ON lead_payments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사의 사용자만 삽입 가능
CREATE POLICY "Users can insert own company payments"
  ON lead_payments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사의 사용자만 수정 가능
CREATE POLICY "Users can update own company payments"
  ON lead_payments FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사의 사용자만 삭제 가능
CREATE POLICY "Users can delete own company payments"
  ON lead_payments FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: 코멘트 추가
-- ============================================================================

COMMENT ON TABLE lead_payments IS '리드별 결제 내역 테이블';
COMMENT ON COLUMN lead_payments.id IS '결제 내역 고유 ID';
COMMENT ON COLUMN lead_payments.lead_id IS '연결된 리드 ID';
COMMENT ON COLUMN lead_payments.company_id IS '회사 ID';
COMMENT ON COLUMN lead_payments.amount IS '결제 금액';
COMMENT ON COLUMN lead_payments.payment_date IS '결제 날짜';
COMMENT ON COLUMN lead_payments.notes IS '결제 비고';
COMMENT ON COLUMN lead_payments.created_at IS '생성 시간';
COMMENT ON COLUMN lead_payments.created_by IS '생성자 ID';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'lead_payments 테이블 생성 완료';
  RAISE NOTICE '- id: UUID (PK)';
  RAISE NOTICE '- lead_id: 리드 참조';
  RAISE NOTICE '- company_id: 회사 참조';
  RAISE NOTICE '- amount: 결제 금액';
  RAISE NOTICE '- payment_date: 결제 날짜';
  RAISE NOTICE '- notes: 비고';
END $$;
