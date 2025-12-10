-- ============================================================================
-- Lead Status Logs Table Extension
-- Created: 2025-12-10
-- Description: lead_status_logs 테이블을 확장하여 다양한 필드 변경 이력 기록
-- ============================================================================

-- ============================================================================
-- STEP 1: 필드 타입 컬럼 추가
-- ============================================================================

-- field_type: 변경된 필드 유형 (status, call_assigned_to, counselor_assigned_to, notes)
ALTER TABLE lead_status_logs ADD COLUMN IF NOT EXISTS field_type TEXT DEFAULT 'status';

-- previous_value, new_value: 범용 값 저장 (status 외의 필드용)
ALTER TABLE lead_status_logs ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE lead_status_logs ADD COLUMN IF NOT EXISTS new_value TEXT;

-- ============================================================================
-- STEP 2: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lead_status_logs_field_type ON lead_status_logs(field_type);

-- ============================================================================
-- STEP 3: 코멘트 업데이트
-- ============================================================================

COMMENT ON COLUMN lead_status_logs.field_type IS '변경 필드 유형 (status, call_assigned_to, counselor_assigned_to, notes)';
COMMENT ON COLUMN lead_status_logs.previous_value IS '이전 값 (범용)';
COMMENT ON COLUMN lead_status_logs.new_value IS '새 값 (범용)';

-- 테이블 코멘트 업데이트
COMMENT ON TABLE lead_status_logs IS '리드 필드 변경 이력 테이블 (상태, 담당자, 비고 등)';
