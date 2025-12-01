-- ============================================================================
-- 랜딩 페이지 누락된 컬럼 추가 (안전 버전)
-- 기존 테이블 구조에 필요한 모든 컬럼 추가
-- Created: 2025-02-01
-- ============================================================================

-- ============================================================================
-- STEP 1: 기본 정보 컬럼
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 2: 수집 설정 컬럼
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS collect_data BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS collect_fields JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS collection_mode TEXT
    CHECK (collection_mode IN ('inline', 'external')) DEFAULT 'inline';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 3: 외부 수집 페이지 설정
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS external_page_slug TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS external_page_params JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 4: UI 설정
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS description_enabled BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 5: 실시간 현황
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS realtime_enabled BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS realtime_template TEXT
    DEFAULT '{name}님이 {location}에서 신청하셨습니다';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS realtime_speed INTEGER DEFAULT 5;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS realtime_count INTEGER DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 6: CTA 버튼
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_enabled BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '상담 신청하기';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_color TEXT DEFAULT '#6366f1';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS cta_sticky_position TEXT
    CHECK (cta_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 7: 타이머
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS timer_enabled BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS timer_deadline TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS timer_color TEXT DEFAULT '#ef4444';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS timer_sticky_position TEXT
    CHECK (timer_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 8: 전화 버튼
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS call_button_enabled BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS call_button_phone TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS call_button_color TEXT DEFAULT '#10B981';
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS call_button_sticky_position TEXT
    CHECK (call_button_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 9: 개인정보 동의
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS require_privacy_consent BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS require_marketing_consent BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS privacy_content TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS marketing_content TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 10: 상태 관리
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 11: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON landing_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_pages_collection_mode ON landing_pages(collection_mode);
CREATE INDEX IF NOT EXISTS idx_landing_pages_external_slug ON landing_pages(external_page_slug)
  WHERE external_page_slug IS NOT NULL;

-- ============================================================================
-- STEP 12: 코멘트 추가
-- ============================================================================

COMMENT ON COLUMN landing_pages.collect_data IS '데이터 수집 여부';
COMMENT ON COLUMN landing_pages.collect_fields IS '수집 필드 설정 (JSONB)';
COMMENT ON COLUMN landing_pages.collection_mode IS '수집 모드: inline (페이지 내), external (외부 페이지)';
COMMENT ON COLUMN landing_pages.cta_sticky_position IS 'CTA 버튼 화면 고정 위치: none, top, bottom';
COMMENT ON COLUMN landing_pages.timer_sticky_position IS '타이머 화면 고정 위치: none, top, bottom';
COMMENT ON COLUMN landing_pages.call_button_enabled IS '전화 버튼 표시 여부';
COMMENT ON COLUMN landing_pages.call_button_phone IS '전화 버튼 전화번호';
COMMENT ON COLUMN landing_pages.call_button_color IS '전화 버튼 배경색 (HEX)';
COMMENT ON COLUMN landing_pages.call_button_sticky_position IS '전화 버튼 화면 고정 위치: none, top, bottom';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '랜딩 페이지 컬럼 추가 완료';
  RAISE NOTICE '- 기본 정보: description, images';
  RAISE NOTICE '- 수집 설정: collect_data, collect_fields, collection_mode';
  RAISE NOTICE '- 실시간 현황: realtime_enabled, realtime_template, realtime_speed, realtime_count';
  RAISE NOTICE '- CTA 버튼: cta_enabled, cta_text, cta_color, cta_sticky_position';
  RAISE NOTICE '- 타이머: timer_enabled, timer_deadline, timer_color, timer_sticky_position';
  RAISE NOTICE '- 전화 버튼: call_button_enabled, call_button_phone, call_button_color, call_button_sticky_position';
  RAISE NOTICE '- 개인정보: require_privacy_consent, require_marketing_consent, privacy_content, marketing_content';
  RAISE NOTICE '- 상태: is_active';
END $$;
