-- ============================================================================
-- 랜딩 페이지 수집 옵션 시스템 (페이지 내 수집 vs 외부 페이지 수집)
-- Created: 2025-01-30
-- ============================================================================

-- ============================================================================
-- STEP 1: landing_pages 테이블 확장
-- ============================================================================

-- 수집 모드 (페이지 내 수집 vs 외부 페이지 수집)
ALTER TABLE landing_pages
ADD COLUMN collection_mode TEXT CHECK (collection_mode IN ('inline', 'external')) DEFAULT 'inline';

COMMENT ON COLUMN landing_pages.collection_mode IS '수집 모드: inline (페이지 내), external (외부 페이지)';

-- 외부 수집 페이지 설정
ALTER TABLE landing_pages
ADD COLUMN external_page_slug TEXT;

COMMENT ON COLUMN landing_pages.external_page_slug IS '외부 수집 페이지 고정 slug (collection_mode=external일 때 사용)';

-- 외부 페이지 추적 파라미터
ALTER TABLE landing_pages
ADD COLUMN external_page_params JSONB DEFAULT '{}';

COMMENT ON COLUMN landing_pages.external_page_params IS '외부 페이지 UTM 파라미터 및 추적 정보 (JSON)';

-- 타이머 고정 위치 (상단/하단)
ALTER TABLE landing_pages
ADD COLUMN timer_sticky_position TEXT CHECK (timer_sticky_position IN ('none', 'top', 'bottom')) DEFAULT 'none';

COMMENT ON COLUMN landing_pages.timer_sticky_position IS '타이머 화면 고정 위치: none, top, bottom';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_landing_pages_collection_mode ON landing_pages(collection_mode);
CREATE INDEX IF NOT EXISTS idx_landing_pages_external_slug ON landing_pages(external_page_slug) WHERE external_page_slug IS NOT NULL;

-- ============================================================================
-- STEP 2: external_collection_pages 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS external_collection_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 기본 정보
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- 수집 필드 설정
  collect_fields JSONB NOT NULL DEFAULT '[
    {"id": "name", "type": "text", "label": "이름", "required": true},
    {"id": "phone", "type": "tel", "label": "전화번호", "required": true},
    {"id": "email", "type": "email", "label": "이메일", "required": false},
    {"id": "address", "type": "text", "label": "주소", "required": false},
    {"id": "birth_date", "type": "date", "label": "생년월일", "required": false},
    {"id": "gender", "type": "select", "label": "성별", "options": ["남성", "여성"], "required": false},
    {"id": "consultation_type", "type": "select", "label": "상담 유형", "options": [], "required": false},
    {"id": "message", "type": "textarea", "label": "상담 내용", "required": false}
  ]',

  -- 디자인 설정
  theme JSONB DEFAULT '{
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#10B981"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter"
    }
  }',

  -- 완료 후 설정
  success_message TEXT DEFAULT '신청이 완료되었습니다. 곧 연락드리겠습니다.',
  redirect_url TEXT,

  -- 통계
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  -- 상태
  is_active BOOLEAN DEFAULT TRUE,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_external_collection_pages_company_id ON external_collection_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_external_collection_pages_slug ON external_collection_pages(slug);
CREATE INDEX IF NOT EXISTS idx_external_collection_pages_is_active ON external_collection_pages(is_active);

COMMENT ON TABLE external_collection_pages IS '외부 수집 페이지 관리';

-- ============================================================================
-- STEP 3: leads 테이블 확장
-- ============================================================================

-- 수집 출처
ALTER TABLE leads
ADD COLUMN collection_source TEXT CHECK (collection_source IN ('inline', 'external')) DEFAULT 'inline';

COMMENT ON COLUMN leads.collection_source IS '수집 출처: inline (랜딩 페이지 내), external (외부 수집 페이지)';

-- 외부 수집 페이지 참조
ALTER TABLE leads
ADD COLUMN external_page_id UUID REFERENCES external_collection_pages(id) ON DELETE SET NULL;

COMMENT ON COLUMN leads.external_page_id IS '외부 수집 페이지 ID (collection_source=external일 때)';

-- 확장 개인정보 필드
ALTER TABLE leads
ADD COLUMN address TEXT;

COMMENT ON COLUMN leads.address IS '주소 (외부 페이지 수집 시)';

ALTER TABLE leads
ADD COLUMN birth_date DATE;

COMMENT ON COLUMN leads.birth_date IS '생년월일 (외부 페이지 수집 시)';

ALTER TABLE leads
ADD COLUMN gender TEXT;

COMMENT ON COLUMN leads.gender IS '성별 (외부 페이지 수집 시)';

ALTER TABLE leads
ADD COLUMN consultation_type TEXT;

COMMENT ON COLUMN leads.consultation_type IS '상담 유형 (외부 페이지 수집 시)';

ALTER TABLE leads
ADD COLUMN detailed_message TEXT;

COMMENT ON COLUMN leads.detailed_message IS '상세 상담 내용 (외부 페이지 수집 시, message와 별도)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_leads_collection_source ON leads(collection_source);
CREATE INDEX IF NOT EXISTS idx_leads_external_page_id ON leads(external_page_id) WHERE external_page_id IS NOT NULL;

-- ============================================================================
-- STEP 4: RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE external_collection_pages ENABLE ROW LEVEL SECURITY;

-- EXTERNAL COLLECTION PAGES POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view external collection pages in their company"
    ON external_collection_pages FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Marketing staff can manage external collection pages"
    ON external_collection_pages FOR ALL
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

-- Update updated_at trigger for external_collection_pages
DO $$ BEGIN
  CREATE TRIGGER update_external_collection_pages_updated_at BEFORE UPDATE ON external_collection_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Function to increment external page views
CREATE OR REPLACE FUNCTION increment_external_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE external_collection_pages
  SET views_count = views_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment external page submissions
CREATE OR REPLACE FUNCTION increment_external_page_submissions(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE external_collection_pages
  SET submissions_count = submissions_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Initial Data Migration (Optional)
-- ============================================================================

-- 기존 landing_pages의 collection_mode를 'inline'으로 명시적 설정 (이미 기본값이지만 명확성을 위해)
UPDATE landing_pages
SET collection_mode = 'inline'
WHERE collection_mode IS NULL;
