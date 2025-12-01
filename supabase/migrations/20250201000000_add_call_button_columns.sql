-- ============================================================================
-- 랜딩 페이지 전화 버튼 기능 추가
-- Created: 2025-02-01
-- ============================================================================

-- 전화 버튼 활성화 여부
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS call_button_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN landing_pages.call_button_enabled IS '전화 버튼 표시 여부';

-- 전화번호
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS call_button_phone TEXT;

COMMENT ON COLUMN landing_pages.call_button_phone IS '전화 버튼 전화번호';

-- 전화 버튼 색상
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS call_button_color TEXT DEFAULT '#10B981';

COMMENT ON COLUMN landing_pages.call_button_color IS '전화 버튼 배경색 (HEX)';
