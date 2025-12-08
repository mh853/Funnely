-- ============================================================================
-- Remove Phone Hash Unique Constraint
-- Created: 2025-02-11
-- Description: phone_hash unique 제약조건 제거 - 동일 전화번호 중복 제출 허용
-- ============================================================================

-- leads 테이블의 (hospital_id, phone_hash) 또는 (company_id, phone_hash) UNIQUE 제약조건 제거
-- 제약조건 이름이 다를 수 있으므로 여러 가능한 이름 시도

-- 방법 1: 제약조건 이름으로 삭제 시도
DO $$
BEGIN
  -- leads_hospital_id_phone_hash_key 형식
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_hospital_id_phone_hash_key'
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_hospital_id_phone_hash_key;
    RAISE NOTICE 'Dropped constraint: leads_hospital_id_phone_hash_key';
  END IF;

  -- leads_company_id_phone_hash_key 형식
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'leads_company_id_phone_hash_key'
    AND table_name = 'leads'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_company_id_phone_hash_key;
    RAISE NOTICE 'Dropped constraint: leads_company_id_phone_hash_key';
  END IF;
END $$;

-- 방법 2: 모든 UNIQUE 제약조건 중 phone_hash 관련 찾아서 삭제
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'leads'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'phone_hash'
  LOOP
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
  END LOOP;
END $$;

-- 확인: phone_hash 인덱스는 유지 (검색 성능용)
-- CREATE INDEX IF NOT EXISTS idx_leads_phone_hash ON leads(phone_hash);
-- 위 인덱스는 이미 존재하므로 추가 생성 불필요

COMMENT ON COLUMN leads.phone_hash IS '전화번호 해시 - 중복 체크용 (분석 목적, UNIQUE 제약 없음)';
