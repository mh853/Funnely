-- ============================================================================
-- 리드 상태(결과) 관리 테이블 생성
-- 회사별로 커스텀 상태를 관리할 수 있게 함
-- Created: 2025-02-20
-- ============================================================================

-- ============================================================================
-- STEP 1: lead_statuses 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- ============================================================================
-- STEP 2: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lead_statuses_company_id ON lead_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_statuses_sort_order ON lead_statuses(company_id, sort_order);

-- ============================================================================
-- STEP 3: RLS 정책
-- ============================================================================

ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;

-- 같은 회사 사용자만 조회 가능
CREATE POLICY "Users can view own company statuses"
  ON lead_statuses FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 관리자만 삽입 가능
CREATE POLICY "Admins can insert statuses"
  ON lead_statuses FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND simple_role = 'admin'
    )
  );

-- 관리자만 수정 가능
CREATE POLICY "Admins can update statuses"
  ON lead_statuses FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND simple_role = 'admin'
    )
  );

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete statuses"
  ON lead_statuses FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND simple_role = 'admin'
    )
  );

-- ============================================================================
-- STEP 4: updated_at 자동 업데이트 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_statuses_updated_at
  BEFORE UPDATE ON lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_statuses_updated_at();

-- ============================================================================
-- STEP 5: 기존 회사들에 기본 상태 삽입하는 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_default_lead_statuses(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO lead_statuses (company_id, code, label, color, sort_order, is_default)
  VALUES
    (p_company_id, 'new', '상담 전', 'orange', 1, true),
    (p_company_id, 'rejected', '상담 거절', 'red', 2, false),
    (p_company_id, 'contacted', '상담 진행중', 'sky', 3, false),
    (p_company_id, 'converted', '상담 완료', 'green', 4, false),
    (p_company_id, 'contract_completed', '예약 확정', 'emerald', 5, false),
    (p_company_id, 'needs_followup', '추가상담 필요', 'yellow', 6, false),
    (p_company_id, 'other', '기타', 'gray', 7, false)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: 기존 회사들에 기본 상태 삽입
-- ============================================================================

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM insert_default_lead_statuses(company_record.id);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 7: 새 회사 생성 시 자동으로 기본 상태 삽입하는 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_insert_default_lead_statuses()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM insert_default_lead_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_company_default_statuses
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_insert_default_lead_statuses();

-- ============================================================================
-- STEP 8: 코멘트 추가
-- ============================================================================

COMMENT ON TABLE lead_statuses IS '리드 상태(결과) 관리 테이블 - 회사별 커스텀 상태';
COMMENT ON COLUMN lead_statuses.id IS '상태 고유 ID';
COMMENT ON COLUMN lead_statuses.company_id IS '회사 ID';
COMMENT ON COLUMN lead_statuses.code IS '상태 코드 (영문, 시스템 내부 사용)';
COMMENT ON COLUMN lead_statuses.label IS '상태 표시명 (한글)';
COMMENT ON COLUMN lead_statuses.color IS '상태 색상 (tailwind 색상명: gray, red, orange, yellow, green, emerald, sky, blue, purple)';
COMMENT ON COLUMN lead_statuses.sort_order IS '정렬 순서';
COMMENT ON COLUMN lead_statuses.is_default IS '기본 상태 여부 (새 리드에 적용)';
COMMENT ON COLUMN lead_statuses.is_active IS '활성화 여부';
COMMENT ON COLUMN lead_statuses.created_at IS '생성 시간';
COMMENT ON COLUMN lead_statuses.updated_at IS '수정 시간';

-- ============================================================================
-- 완료 메시지
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'lead_statuses 테이블 생성 완료';
  RAISE NOTICE '- 회사별 커스텀 상태 관리';
  RAISE NOTICE '- 기본 상태 자동 생성';
  RAISE NOTICE '- 관리자만 수정 가능';
END $$;
