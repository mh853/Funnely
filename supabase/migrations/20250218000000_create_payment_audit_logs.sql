-- ============================================================================
-- 결제 내역 감사 로그 테이블 생성
-- 결제 내역의 생성, 수정, 삭제 이력을 추적
-- Created: 2025-02-18
-- ============================================================================

-- ============================================================================
-- STEP 1: payment_audit_logs 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES lead_payments(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_amount INTEGER,
  new_amount INTEGER,
  old_notes TEXT,
  new_notes TEXT,
  old_payment_date TIMESTAMPTZ,
  new_payment_date TIMESTAMPTZ,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- STEP 2: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_lead_id ON payment_audit_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_company_id ON payment_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON payment_audit_logs(created_at DESC);

-- ============================================================================
-- STEP 3: RLS 정책
-- ============================================================================

ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- 같은 회사의 관리자만 조회 가능 (simple_role: admin)
CREATE POLICY "Admins can view own company audit logs"
  ON payment_audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND simple_role = 'admin'
    )
  );

-- 같은 회사의 사용자만 삽입 가능
CREATE POLICY "Users can insert own company audit logs"
  ON payment_audit_logs FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: 코멘트 추가
-- ============================================================================

COMMENT ON TABLE payment_audit_logs IS '결제 내역 변경 감사 로그';
COMMENT ON COLUMN payment_audit_logs.id IS '로그 고유 ID';
COMMENT ON COLUMN payment_audit_logs.lead_id IS '연결된 리드 ID';
COMMENT ON COLUMN payment_audit_logs.payment_id IS '연결된 결제 내역 ID';
COMMENT ON COLUMN payment_audit_logs.company_id IS '회사 ID';
COMMENT ON COLUMN payment_audit_logs.action IS '작업 유형 (create, update, delete)';
COMMENT ON COLUMN payment_audit_logs.old_amount IS '변경 전 금액';
COMMENT ON COLUMN payment_audit_logs.new_amount IS '변경 후 금액';
COMMENT ON COLUMN payment_audit_logs.old_notes IS '변경 전 비고';
COMMENT ON COLUMN payment_audit_logs.new_notes IS '변경 후 비고';
COMMENT ON COLUMN payment_audit_logs.description IS '변경 설명';
COMMENT ON COLUMN payment_audit_logs.created_at IS '생성 시간';
COMMENT ON COLUMN payment_audit_logs.created_by IS '생성자 ID';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'payment_audit_logs 테이블 생성 완료';
  RAISE NOTICE '- 결제 내역 생성/수정/삭제 이력 추적';
  RAISE NOTICE '- 관리자만 조회 가능';
END $$;
