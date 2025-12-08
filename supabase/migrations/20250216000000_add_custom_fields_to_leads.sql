-- ============================================================================
-- 리드 테이블에 커스텀 필드 컬럼 추가
-- 랜딩페이지의 단답형/선택형 필드 데이터를 저장하기 위한 컬럼
-- Created: 2025-02-16
-- ============================================================================

-- ============================================================================
-- STEP 1: 커스텀 필드 컬럼 추가 (최대 5개)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_field_1 TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_field_2 TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_field_3 TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_field_4 TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_field_5 TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 2: 코멘트 추가
-- ============================================================================

COMMENT ON COLUMN leads.custom_field_1 IS '커스텀 필드 1 (단답형/선택형 응답)';
COMMENT ON COLUMN leads.custom_field_2 IS '커스텀 필드 2 (단답형/선택형 응답)';
COMMENT ON COLUMN leads.custom_field_3 IS '커스텀 필드 3 (단답형/선택형 응답)';
COMMENT ON COLUMN leads.custom_field_4 IS '커스텀 필드 4 (단답형/선택형 응답)';
COMMENT ON COLUMN leads.custom_field_5 IS '커스텀 필드 5 (단답형/선택형 응답)';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '리드 테이블 커스텀 필드 컬럼 추가 완료';
  RAISE NOTICE '- custom_field_1: 커스텀 필드 1';
  RAISE NOTICE '- custom_field_2: 커스텀 필드 2';
  RAISE NOTICE '- custom_field_3: 커스텀 필드 3';
  RAISE NOTICE '- custom_field_4: 커스텀 필드 4';
  RAISE NOTICE '- custom_field_5: 커스텀 필드 5';
END $$;
