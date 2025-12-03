-- ============================================================================
-- Lead Status Enum 확장 스크립트
-- Supabase SQL Editor에서 직접 실행하세요
-- ============================================================================

-- 새 상태값 추가
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'converted';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'contract_completed';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'needs_followup';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'other';

-- 확인
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'lead_status'::regtype ORDER BY enumsortorder;
