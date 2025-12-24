-- ============================================================================
-- Add timer auto-update fields to landing_pages
-- Created: 2025-02-24
-- Description: 타이머 자동 업데이트 기능 추가 - 마감일이 지나면 자동으로 연장
-- ============================================================================

-- timer_auto_update: 자동 업데이트 활성화 여부
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS timer_auto_update BOOLEAN DEFAULT false;

-- timer_auto_update_days: 자동 업데이트 시 연장할 일수 (기본 7일)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS timer_auto_update_days INTEGER DEFAULT 7;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN landing_pages.timer_auto_update IS '타이머 자동 업데이트 활성화 여부 (마감일 지나면 자동 연장)';
COMMENT ON COLUMN landing_pages.timer_auto_update_days IS '자동 업데이트 시 연장할 일수 (기본 7일)';

-- 기본값 체크 제약 추가 (1일 이상 365일 이하)
ALTER TABLE landing_pages
ADD CONSTRAINT timer_auto_update_days_check
CHECK (timer_auto_update_days >= 1 AND timer_auto_update_days <= 365);
