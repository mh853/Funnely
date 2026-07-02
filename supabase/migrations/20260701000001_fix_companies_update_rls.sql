-- companies 테이블 UPDATE RLS 정책 수정
-- 기존 정책: hospital_owner 역할만 허용 (구 역할명)
-- 수정 정책: company_owner, company_admin 역할도 허용

DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
DROP POLICY IF EXISTS "Hospital owners can update their hospital" ON companies;

CREATE POLICY "Company admins can update their company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
        AND role IN ('company_owner', 'company_admin', 'hospital_owner')
    )
  );
