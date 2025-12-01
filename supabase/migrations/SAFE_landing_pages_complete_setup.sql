-- ============================================================================
-- 랜딩 페이지 시스템 통합 마이그레이션 (안전 버전)
-- 기존 데이터 보존 및 중복 방지
-- Created: 2025-02-01
-- ============================================================================

-- ============================================================================
-- STEP 1: ENUMS 생성 (이미 존재하면 스킵)
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new', 'assigned', 'contacting', 'consulting',
    'completed', 'on_hold', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'consultation', 'callback', 'meeting', 'task', 'reminder'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: landing_pages 테이블 생성 (company_id 버전)
-- ============================================================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 기본 정보
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',

  -- 수집 설정
  collect_data BOOLEAN DEFAULT TRUE,
  collect_fields JSONB DEFAULT '[]',
  collection_mode TEXT CHECK (collection_mode IN ('inline', 'external')) DEFAULT 'inline',

  -- 외부 수집 페이지
  external_page_slug TEXT,
  external_page_params JSONB DEFAULT '{}',

  -- 설명 표시
  description_enabled BOOLEAN DEFAULT TRUE,

  -- 실시간 현황
  realtime_enabled BOOLEAN DEFAULT FALSE,
  realtime_template TEXT DEFAULT '{name}님이 {location}에서 신청하셨습니다',
  realtime_speed INTEGER DEFAULT 5,
  realtime_count INTEGER DEFAULT 10,

  -- CTA 버튼
  cta_enabled BOOLEAN DEFAULT TRUE,
  cta_text TEXT DEFAULT '상담 신청하기',
  cta_color TEXT DEFAULT '#6366f1',
  cta_sticky_position TEXT CHECK (cta_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none',

  -- 타이머
  timer_enabled BOOLEAN DEFAULT FALSE,
  timer_deadline TIMESTAMPTZ,
  timer_color TEXT DEFAULT '#ef4444',
  timer_sticky_position TEXT CHECK (timer_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none',

  -- 전화 버튼
  call_button_enabled BOOLEAN DEFAULT FALSE,
  call_button_phone TEXT,
  call_button_color TEXT DEFAULT '#10B981',
  call_button_sticky_position TEXT CHECK (call_button_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none',

  -- 개인정보 동의
  require_privacy_consent BOOLEAN DEFAULT TRUE,
  require_marketing_consent BOOLEAN DEFAULT FALSE,
  privacy_content TEXT,
  marketing_content TEXT,

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,

  -- 통계
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  -- 타임스탬프
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (이미 존재하면 스킵)
CREATE INDEX IF NOT EXISTS idx_landing_pages_company_id ON landing_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_active ON landing_pages(is_active);
CREATE INDEX IF NOT EXISTS idx_landing_pages_collection_mode ON landing_pages(collection_mode);
CREATE INDEX IF NOT EXISTS idx_landing_pages_external_slug ON landing_pages(external_page_slug)
  WHERE external_page_slug IS NOT NULL;

COMMENT ON TABLE landing_pages IS '랜딩 페이지 관리';

-- ============================================================================
-- STEP 3: 기존 컬럼 추가 (테이블이 이미 존재하는 경우)
-- ============================================================================

-- 기본 정보 컬럼
DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 수집 설정
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

-- 외부 수집 페이지
DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS external_page_slug TEXT;
EXCEPTION WHEN duplicate_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS external_page_params JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 설명 표시
DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS description_enabled BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- 실시간 현황
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

-- CTA 버튼
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

-- 타이머
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

-- 전화 버튼 (새로 추가)
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

-- 개인정보 동의
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

-- 상태
DO $$ BEGIN
  ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN null; END $$;

-- ============================================================================
-- STEP 4: RLS (Row Level Security) 정책
-- ============================================================================

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;

-- 정책: 사용자는 자신의 회사 랜딩 페이지만 조회 가능
DO $$ BEGIN
  CREATE POLICY "Users can view landing pages in their company"
    ON landing_pages FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 정책: 마케팅 담당자는 랜딩 페이지 관리 가능
DO $$ BEGIN
  CREATE POLICY "Marketing staff can manage landing pages"
    ON landing_pages FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 5: Functions and Triggers
-- ============================================================================

-- updated_at 자동 업데이트 함수 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_landing_pages_updated_at ON landing_pages;
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET views_count = views_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 신청수 증가 함수
CREATE OR REPLACE FUNCTION increment_landing_page_submissions(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET submissions_count = submissions_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '랜딩 페이지 시스템 통합 마이그레이션 완료';
  RAISE NOTICE '- landing_pages 테이블: 생성 또는 업데이트됨';
  RAISE NOTICE '- 모든 필수 컬럼: 추가됨 (기존 데이터 보존)';
  RAISE NOTICE '- RLS 정책: 설정됨';
  RAISE NOTICE '- 트리거 및 함수: 생성됨';
END $$;
