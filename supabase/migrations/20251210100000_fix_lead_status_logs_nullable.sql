-- ============================================================================
-- Fix lead_status_logs: Make new_status nullable for non-status field changes
-- Created: 2025-12-10
-- Description: new_status NOT NULL 제약 제거 - 콜담당자/상담담당자/비고 변경 시에는 new_status가 불필요
-- ============================================================================

-- new_status 컬럼을 nullable로 변경
ALTER TABLE lead_status_logs ALTER COLUMN new_status DROP NOT NULL;

-- 코멘트 업데이트
COMMENT ON COLUMN lead_status_logs.new_status IS '새 상태 (field_type이 status인 경우에만 필수)';
