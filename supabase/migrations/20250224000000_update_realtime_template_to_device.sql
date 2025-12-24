-- ============================================================================
-- Update existing realtime templates from {location} to {device}
-- Created: 2025-02-24
-- Description: 기존 랜딩페이지의 realtime_template에서 {location}을 {device}로 변경
-- ============================================================================

-- 기존 템플릿의 {location}을 {device}로 변경
UPDATE landing_pages
SET realtime_template = REPLACE(realtime_template, '{location}', '{device}')
WHERE realtime_template LIKE '%{location}%';

-- 변경된 행 수 확인
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '% landing pages updated: {location} → {device}', updated_count;
END $$;
