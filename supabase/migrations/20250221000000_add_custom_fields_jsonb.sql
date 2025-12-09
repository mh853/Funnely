-- ============================================================================
-- 리드 테이블에 JSONB 형태의 custom_fields 컬럼 추가
-- 무제한 커스텀 필드를 저장할 수 있는 유연한 구조
-- Created: 2025-02-21
-- ============================================================================

-- ============================================================================
-- STEP 1: JSONB 컬럼 추가
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 2: 기존 custom_field_1~5 데이터를 새 JSONB 컬럼으로 마이그레이션
-- ============================================================================

UPDATE leads
SET custom_fields = (
  SELECT jsonb_agg(jsonb_build_object('label', label, 'value', value))
  FROM (
    SELECT 'custom_field_1' as label, custom_field_1 as value WHERE custom_field_1 IS NOT NULL
    UNION ALL
    SELECT 'custom_field_2', custom_field_2 WHERE custom_field_2 IS NOT NULL
    UNION ALL
    SELECT 'custom_field_3', custom_field_3 WHERE custom_field_3 IS NOT NULL
    UNION ALL
    SELECT 'custom_field_4', custom_field_4 WHERE custom_field_4 IS NOT NULL
    UNION ALL
    SELECT 'custom_field_5', custom_field_5 WHERE custom_field_5 IS NOT NULL
  ) sub
)
WHERE custom_field_1 IS NOT NULL
   OR custom_field_2 IS NOT NULL
   OR custom_field_3 IS NOT NULL
   OR custom_field_4 IS NOT NULL
   OR custom_field_5 IS NOT NULL;

-- NULL인 경우 빈 배열로 설정
UPDATE leads SET custom_fields = '[]'::jsonb WHERE custom_fields IS NULL;

-- ============================================================================
-- STEP 3: 코멘트 추가
-- ============================================================================

COMMENT ON COLUMN leads.custom_fields IS '커스텀 필드 데이터 (JSONB). 형식: [{"label": "질문명", "value": "답변"}]';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'leads 테이블 custom_fields JSONB 컬럼 추가 완료';
  RAISE NOTICE '- custom_fields: JSONB 형태로 무제한 커스텀 필드 저장 가능';
  RAISE NOTICE '- 기존 custom_field_1~5 데이터가 마이그레이션됨';
END $$;
