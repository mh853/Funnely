-- ============================================================================
-- landing_pages 테이블에 누락된 success_message, completion_info_message 컬럼 추가
-- Created: 2025-02-21
-- ============================================================================

-- success_message 컬럼 추가 (완료 페이지 메인 메시지)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS success_message TEXT DEFAULT '신청이 완료되었습니다. 곧 연락드리겠습니다.';

COMMENT ON COLUMN landing_pages.success_message IS '완료 페이지 메인 성공 메시지';

-- completion_info_message 컬럼 추가 (완료 페이지 Info Box)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS completion_info_message TEXT DEFAULT '담당자가 빠른 시일 내에 연락드릴 예정입니다.
입력하신 연락처로 안내 문자가 발송됩니다.';

COMMENT ON COLUMN landing_pages.completion_info_message IS '완료 페이지 Info Box 안내 멘트';

-- 완료 메시지
DO $$ BEGIN
  RAISE NOTICE 'landing_pages 테이블 success_message, completion_info_message 컬럼 추가 완료';
END $$;
