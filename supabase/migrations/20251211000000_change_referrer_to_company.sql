-- ============================================================================
-- Referrer 추적을 User 기반에서 Company 기반으로 변경
-- Created: 2025-12-11
-- NOTE: 이 마이그레이션은 generate_short_id() 함수가 이미 존재한다고 가정합니다 (20250212000000_add_user_short_id.sql)
-- Description: ref 파라미터를 사용자별이 아닌 회사별로 추적하도록 변경
-- ============================================================================

-- ============================================================================
-- STEP 1: companies 테이블에 short_id 컬럼 추가
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;

-- ============================================================================
-- STEP 2: 기존 회사에 short_id 부여 (generate_short_id 함수 재사용)
-- ============================================================================

DO $$
DECLARE
  company_record RECORD;
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT;
BEGIN
  FOR company_record IN SELECT id FROM companies WHERE short_id IS NULL LOOP
    attempt := 0;
    LOOP
      new_short_id := generate_short_id(6);
      BEGIN
        UPDATE companies SET short_id = new_short_id WHERE id = company_record.id;
        EXIT; -- 성공하면 루프 탈출
      EXCEPTION WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: 새 회사 생성 시 자동으로 short_id 부여하는 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION set_company_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  IF NEW.short_id IS NULL THEN
    LOOP
      new_short_id := generate_short_id(6);
      -- 중복 체크
      IF NOT EXISTS (SELECT 1 FROM companies WHERE short_id = new_short_id) THEN
        NEW.short_id := new_short_id;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS trigger_set_company_short_id ON companies;

-- 트리거 생성
CREATE TRIGGER trigger_set_company_short_id
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_company_short_id();

-- ============================================================================
-- STEP 4: companies.short_id 인덱스 생성
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_short_id ON companies(short_id);

-- ============================================================================
-- STEP 5: leads 테이블에 referrer_company_id 컬럼 추가
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_company_id UUID REFERENCES companies(id);

-- ============================================================================
-- STEP 6: 기존 referrer_user_id 데이터를 referrer_company_id로 마이그레이션
-- (사용자의 회사 ID로 변환)
-- ============================================================================

UPDATE leads l
SET referrer_company_id = (
  SELECT u.company_id
  FROM users u
  WHERE u.id = l.referrer_user_id
)
WHERE l.referrer_user_id IS NOT NULL
  AND l.referrer_company_id IS NULL;

-- ============================================================================
-- STEP 7: referrer_company_id 인덱스 생성
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_referrer_company_id ON leads(referrer_company_id);

-- ============================================================================
-- STEP 8: 기존 referrer_user_id 컬럼 및 인덱스 삭제
-- ============================================================================

DROP INDEX IF EXISTS idx_leads_referrer_user_id;
ALTER TABLE leads DROP COLUMN IF EXISTS referrer_user_id;

-- ============================================================================
-- STEP 9: 코멘트 추가
-- ============================================================================

COMMENT ON COLUMN companies.short_id IS '회사 짧은 ID (랜딩페이지 ref 파라미터용, 예: c7k2m9)';
COMMENT ON COLUMN leads.referrer_company_id IS '유입 경로 추적 (ref 파라미터로 전달된 회사 ID)';
