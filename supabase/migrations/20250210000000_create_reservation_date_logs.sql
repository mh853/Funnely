-- ============================================================================
-- Reservation Date Logs Table
-- Created: 2025-02-10
-- Description: 예약일(contract_completed_at) 변경 이력을 기록하는 테이블
-- ============================================================================

-- ============================================================================
-- STEP 1: reservation_date_logs 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservation_date_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  previous_date TIMESTAMPTZ,
  new_date TIMESTAMPTZ NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: 인덱스 생성
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reservation_date_logs_lead_id ON reservation_date_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_reservation_date_logs_company_id ON reservation_date_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_reservation_date_logs_created_at ON reservation_date_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservation_date_logs_changed_by ON reservation_date_logs(changed_by);

-- ============================================================================
-- STEP 3: RLS 정책 설정
-- ============================================================================

ALTER TABLE reservation_date_logs ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회 가능
CREATE POLICY "Users can view their company's reservation date logs"
  ON reservation_date_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사 사용자만 삽입 가능
CREATE POLICY "Users can insert their company's reservation date logs"
  ON reservation_date_logs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 삭제/수정은 불가 (로그 무결성 유지)
-- DELETE, UPDATE 정책 없음

-- ============================================================================
-- STEP 4: 코멘트 추가
-- ============================================================================

COMMENT ON TABLE reservation_date_logs IS '예약일 변경 이력 테이블';
COMMENT ON COLUMN reservation_date_logs.lead_id IS '리드 ID (FK)';
COMMENT ON COLUMN reservation_date_logs.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN reservation_date_logs.previous_date IS '이전 예약일';
COMMENT ON COLUMN reservation_date_logs.new_date IS '새 예약일';
COMMENT ON COLUMN reservation_date_logs.changed_by IS '변경한 사용자 ID (FK)';
COMMENT ON COLUMN reservation_date_logs.notes IS '변경 메모/비고';
COMMENT ON COLUMN reservation_date_logs.created_at IS '변경 일시';
