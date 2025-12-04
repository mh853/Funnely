-- ============================================================================
-- Add notes column to leads table
-- ============================================================================

-- 비고(메모) 필드 추가
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN leads.notes IS '비고/메모';
