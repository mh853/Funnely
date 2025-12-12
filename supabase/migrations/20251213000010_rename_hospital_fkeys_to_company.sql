-- Rename hospital foreign keys to company foreign keys
-- 목적: hospital → company 리네이밍 완성

-- 1. leads 테이블의 외래 키 이름 변경
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_hospital_id_fkey,
  ADD CONSTRAINT leads_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES companies(id)
    ON DELETE CASCADE;

-- 2. referrer_company_id 외래 키는 그대로 유지 (이미 company 이름 사용)

-- 변경 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraints renamed from hospital to company successfully';
END $$;
