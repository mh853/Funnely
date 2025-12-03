-- ============================================================================
-- Add contract_completed_at column to leads table
-- Created: 2025-02-03
-- Description: 계약 완료 날짜/시간을 저장하는 컬럼 추가
-- ============================================================================

-- contract_completed_at 컬럼 추가
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contract_completed_at TIMESTAMPTZ;

-- 인덱스 추가 (예약 스케줄 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_leads_contract_completed_at ON leads(contract_completed_at);

-- 코멘트 추가
COMMENT ON COLUMN leads.contract_completed_at IS '계약 완료 예정 날짜/시간';
