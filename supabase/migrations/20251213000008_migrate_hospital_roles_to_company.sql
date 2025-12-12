-- Phase 4: hospital 역할을 company 역할로 마이그레이션
-- 목적: hospital_owner → company_owner, hospital_admin → company_admin 데이터 변환

-- 1. 기존 hospital 역할을 company 역할로 변경
UPDATE users
SET role = 'company_owner'
WHERE role = 'hospital_owner';

UPDATE users
SET role = 'company_admin'
WHERE role = 'hospital_admin';

-- 2. 변경 결과 확인을 위한 코멘트
COMMENT ON TYPE user_role IS 'User roles: company_owner, company_admin, marketing_manager, marketing_staff, viewer (legacy values migrated)';

-- 3. 마이그레이션 결과 로깅
DO $$
DECLARE
  owner_count INTEGER;
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO owner_count FROM users WHERE role = 'company_owner';
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'company_admin';

  RAISE NOTICE 'Migration completed: % company_owner, % company_admin', owner_count, admin_count;
END $$;
