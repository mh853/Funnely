-- ============================================================================
-- Lead Status Logs Table
-- Created: 2025-02-09
-- Description: 리드 상태 변경 이력을 기록하는 테이블
-- ============================================================================

-- ============================================================================
-- STEP 1: lead_status_logs 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: 인덱스 생성
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lead_status_logs_lead_id ON lead_status_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_logs_company_id ON lead_status_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_logs_created_at ON lead_status_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_status_logs_changed_by ON lead_status_logs(changed_by);

-- ============================================================================
-- STEP 3: RLS 정책 설정
-- ============================================================================

ALTER TABLE lead_status_logs ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회 가능
CREATE POLICY "Users can view their company's lead status logs"
  ON lead_status_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사 사용자만 삽입 가능
CREATE POLICY "Users can insert their company's lead status logs"
  ON lead_status_logs
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

COMMENT ON TABLE lead_status_logs IS '리드 상태 변경 이력 테이블';
COMMENT ON COLUMN lead_status_logs.lead_id IS '리드 ID (FK)';
COMMENT ON COLUMN lead_status_logs.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN lead_status_logs.previous_status IS '이전 상태';
COMMENT ON COLUMN lead_status_logs.new_status IS '새 상태';
COMMENT ON COLUMN lead_status_logs.changed_by IS '변경한 사용자 ID (FK)';
COMMENT ON COLUMN lead_status_logs.notes IS '변경 메모/비고';
COMMENT ON COLUMN lead_status_logs.created_at IS '변경 일시';
