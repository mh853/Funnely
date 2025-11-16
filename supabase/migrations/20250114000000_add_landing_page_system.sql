-- ============================================================================
-- DB 게더링 랜딩 페이지 시스템
-- Created: 2025-01-14
-- ============================================================================

-- ============================================================================
-- STEP 1: ENUMS (먼저 실행)
-- ============================================================================

-- 리드 상태
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new',           -- 신규
    'assigned',      -- 배정됨
    'contacting',    -- 연락중
    'consulting',    -- 상담중
    'completed',     -- 상담완료
    'on_hold',       -- 보류
    'cancelled'      -- 취소
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 리드 우선순위
DO $$ BEGIN
  CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 캘린더 이벤트 타입
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'consultation',  -- 상담
    'callback',      -- 재연락
    'meeting',       -- 미팅
    'task',          -- 업무
    'reminder'       -- 리마인더
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 사용자 역할 확장 (별도 트랜잭션으로 실행 필요)
-- 주의: 이 부분은 별도로 실행해야 합니다
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'call_center_manager';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'call_center_staff';

-- ============================================================================
-- LANDING PAGES TABLE (랜딩 페이지 관리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

  -- 기본 정보
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL: https://slug.medisync.kr
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published, archived

  -- 페이지 설정
  template_id TEXT NOT NULL DEFAULT 'basic', -- 템플릿 식별자
  theme JSONB DEFAULT '{"colors": {"primary": "#3B82F6", "secondary": "#10B981"}, "fonts": {"heading": "Inter", "body": "Inter"}}',
  sections JSONB DEFAULT '[]', -- 섹션 구성 데이터

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_image TEXT,

  -- 추적
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,

  -- 통계
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_landing_pages_hospital_id ON landing_pages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_status ON landing_pages(status);

COMMENT ON TABLE landing_pages IS '랜딩 페이지 관리';

-- ============================================================================
-- FORM TEMPLATES TABLE (폼 템플릿)
-- ============================================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- 폼 설정
  fields JSONB NOT NULL DEFAULT '[
    {"id": "name", "type": "text", "label": "이름", "required": true},
    {"id": "phone", "type": "tel", "label": "전화번호", "required": true},
    {"id": "email", "type": "email", "label": "이메일", "required": false}
  ]',
  validation_rules JSONB DEFAULT '{}',
  success_message TEXT DEFAULT '신청이 완료되었습니다. 곧 연락드리겠습니다.',

  -- 디자인
  style JSONB DEFAULT '{"layout": "stacked", "buttonColor": "#3B82F6"}',

  -- 플러그인
  enable_timer BOOLEAN DEFAULT FALSE,
  timer_deadline TIMESTAMPTZ,
  enable_counter BOOLEAN DEFAULT FALSE,
  counter_limit INTEGER,
  counter_current INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_templates_hospital_id ON form_templates(hospital_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_is_active ON form_templates(is_active);

COMMENT ON TABLE form_templates IS '폼 템플릿';

-- ============================================================================
-- LEADS TABLE (수집된 리드 정보)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,

  -- 개인정보 (암호화 필요)
  name TEXT NOT NULL,
  phone TEXT NOT NULL, -- 암호화된 전화번호
  phone_hash TEXT NOT NULL, -- 중복 체크용 해시
  email TEXT,

  -- 상담 정보
  consultation_items TEXT[], -- 상담 희망 항목
  preferred_date DATE,
  preferred_time TIME,
  message TEXT,

  -- 리드 관리
  status lead_status NOT NULL DEFAULT 'new',
  priority lead_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  tags TEXT[] DEFAULT '{}',

  -- 유입 분석
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  ip_address INET,
  user_agent TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  UNIQUE(hospital_id, phone_hash)
);

CREATE INDEX IF NOT EXISTS idx_leads_hospital_id ON leads(hospital_id);
CREATE INDEX IF NOT EXISTS idx_leads_landing_page_id ON leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_phone_hash ON leads(phone_hash);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

COMMENT ON TABLE leads IS '수집된 리드 정보';

-- ============================================================================
-- LEAD NOTES TABLE (상담 메모 및 히스토리)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),

  content TEXT NOT NULL,
  attachments TEXT[], -- 첨부파일 URL 배열

  -- 상태 변경 추적
  status_changed_from lead_status,
  status_changed_to lead_status,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_user_id ON lead_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);

COMMENT ON TABLE lead_notes IS '상담 메모 및 히스토리';

-- ============================================================================
-- CALENDAR EVENTS TABLE (캘린더 일정)
-- ============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'consultation',

  -- 일정
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,

  -- 담당자
  assigned_to UUID[] NOT NULL, -- 여러 담당자 가능

  -- 알림
  reminder_minutes INTEGER[] DEFAULT '{30, 60}', -- 30분, 1시간 전

  -- 메타데이터
  location TEXT,
  color TEXT DEFAULT '#3B82F6', -- 캘린더 색상

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_hospital_id ON calendar_events(hospital_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to ON calendar_events USING GIN(assigned_to);

COMMENT ON TABLE calendar_events IS '캘린더 일정';

-- ============================================================================
-- LANDING PAGE ANALYTICS TABLE (랜딩 페이지 분석)
-- ============================================================================
CREATE TABLE IF NOT EXISTS landing_page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- 트래픽
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  -- 전환
  form_submissions INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2), -- %

  -- 유입 경로별
  utm_breakdown JSONB DEFAULT '{}',

  -- 디바이스별
  desktop_views INTEGER DEFAULT 0,
  mobile_views INTEGER DEFAULT 0,
  tablet_views INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(landing_page_id, date)
);

CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_page_id ON landing_page_analytics(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_analytics_date ON landing_page_analytics(date DESC);

COMMENT ON TABLE landing_page_analytics IS '랜딩 페이지 분석';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_page_analytics ENABLE ROW LEVEL SECURITY;

-- LANDING PAGES POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view landing pages in their hospital"
    ON landing_pages FOR SELECT
    USING (
      hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Marketing staff can manage landing pages"
    ON landing_pages FOR ALL
    USING (
      hospital_id IN (
        SELECT hospital_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- FORM TEMPLATES POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view form templates in their hospital"
    ON form_templates FOR SELECT
    USING (
      hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Marketing staff can manage form templates"
    ON form_templates FOR ALL
    USING (
      hospital_id IN (
        SELECT hospital_id FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- LEADS POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view leads in their hospital"
    ON leads FOR SELECT
    USING (
      hospital_id IN (
        SELECT hospital_id FROM users WHERE id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- LEAD NOTES POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view notes for leads in their hospital"
    ON lead_notes FOR SELECT
    USING (
      lead_id IN (
        SELECT id FROM leads
        WHERE hospital_id IN (
          SELECT hospital_id FROM users WHERE id = auth.uid()
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create notes for their leads"
    ON lead_notes FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND lead_id IN (
        SELECT id FROM leads
        WHERE hospital_id IN (
          SELECT hospital_id FROM users WHERE id = auth.uid()
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CALENDAR EVENTS POLICIES
DO $$ BEGIN
  CREATE POLICY "Users can view their assigned events"
    ON calendar_events FOR SELECT
    USING (
      auth.uid() = ANY(assigned_to)
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin')
        AND hospital_id = calendar_events.hospital_id
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their events"
    ON calendar_events FOR ALL
    USING (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('hospital_owner', 'hospital_admin')
        AND hospital_id = calendar_events.hospital_id
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- LANDING PAGE ANALYTICS POLICIES
DO $$ BEGIN
  CREATE POLICY "Marketing staff can view analytics"
    ON landing_page_analytics FOR SELECT
    USING (
      landing_page_id IN (
        SELECT id FROM landing_pages
        WHERE hospital_id IN (
          SELECT hospital_id FROM users WHERE id = auth.uid()
        )
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON landing_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Function to update landing page views count
CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET views_count = views_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update landing page submissions count
CREATE OR REPLACE FUNCTION increment_landing_page_submissions(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET submissions_count = submissions_count + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign lead to least busy staff
CREATE OR REPLACE FUNCTION auto_assign_lead(p_hospital_id UUID, p_lead_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assigned_user_id UUID;
BEGIN
  -- Find staff with least assigned leads (any marketing or admin role)
  SELECT u.id INTO v_assigned_user_id
  FROM users u
  LEFT JOIN (
    SELECT assigned_to, COUNT(*) as lead_count
    FROM leads
    WHERE status NOT IN ('completed', 'cancelled')
    GROUP BY assigned_to
  ) l ON u.id = l.assigned_to
  WHERE u.hospital_id = p_hospital_id
    AND u.role IN ('marketing_staff', 'marketing_manager', 'hospital_admin')
    AND u.is_active = TRUE
  ORDER BY COALESCE(l.lead_count, 0) ASC
  LIMIT 1;

  -- Assign lead
  IF v_assigned_user_id IS NOT NULL THEN
    UPDATE leads
    SET assigned_to = v_assigned_user_id,
        status = 'assigned',
        updated_at = NOW()
    WHERE id = p_lead_id;
  END IF;

  RETURN v_assigned_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
