-- ============================================================================
-- Lead Deletion Logs Table
-- Created: 2026-08-25
-- Description: DB(리드) 삭제 이력을 기록하는 테이블 (Notion 29번 항목)
-- leads.id에 FK를 걸지 않는다 - 리드가 삭제된 뒤에도 "누가 몇 건 지웠는지" 기록이
-- 남아있어야 하는데, lead_status_logs처럼 ON DELETE CASCADE로 걸면 리드 삭제 시
-- 로그 자체도 같이 사라져 목적을 무의미하게 만든다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_deletion_logs_company_id ON lead_deletion_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_deletion_logs_created_at ON lead_deletion_logs(created_at DESC);

ALTER TABLE lead_deletion_logs ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회 가능 (관리자 전용 노출은 API/페이지 레벨에서 처리 -
-- lead_status_logs 등 기존 로그 테이블과 동일하게 RLS는 회사 단위로만 좁힌다)
CREATE POLICY "Users can view their company's lead deletion logs"
  ON lead_deletion_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 같은 회사 사용자만 삽입 가능 - DB 삭제(bulk-delete) 자체가 관리자 전용이 아니므로
-- 삭제를 실행할 수 있는 모든 회사 구성원이 로그도 남길 수 있어야 한다
CREATE POLICY "Users can insert their company's lead deletion logs"
  ON lead_deletion_logs
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 삭제/수정은 불가 (로그 무결성 유지) - DELETE, UPDATE 정책 없음

COMMENT ON TABLE lead_deletion_logs IS 'DB(리드) 삭제 이력 테이블 - PII 없이 건수만 기록';
COMMENT ON COLUMN lead_deletion_logs.company_id IS '회사 ID (FK)';
COMMENT ON COLUMN lead_deletion_logs.deleted_by IS '삭제를 실행한 사용자 ID (FK, 계정 삭제 시 NULL)';
COMMENT ON COLUMN lead_deletion_logs.deleted_count IS '삭제된 리드 건수';
COMMENT ON COLUMN lead_deletion_logs.created_at IS '삭제 실행 일시';
