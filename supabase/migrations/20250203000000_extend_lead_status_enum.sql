-- ============================================================================
-- Lead Status Enum 확장
-- Created: 2025-02-03
-- Description: 추가 상태값들을 lead_status enum에 추가
-- ============================================================================

-- PostgreSQL에서 enum에 값을 추가하는 방법
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS 사용

-- 기존 enum: 'new', 'assigned', 'contacting', 'consulting', 'completed', 'on_hold', 'cancelled'
-- 추가 필요: 'pending', 'rejected', 'contacted', 'converted', 'contract_completed', 'needs_followup', 'other'

-- pending 추가 (new 다음에)
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pending' AFTER 'new';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- rejected 추가
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'cancelled';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- contacted 추가
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'contacted' AFTER 'contacting';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- converted 추가
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'converted' AFTER 'completed';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- contract_completed 추가
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'contract_completed' AFTER 'converted';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- needs_followup 추가
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'needs_followup' AFTER 'on_hold';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- other 추가 (마지막에)
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'other';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 확인용 쿼리 (enum 값 목록)
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'lead_status'::regtype ORDER BY enumsortorder;
