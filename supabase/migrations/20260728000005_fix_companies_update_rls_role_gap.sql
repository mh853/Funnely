-- companies UPDATE RLS 정책이 role IN ('company_owner','company_admin','hospital_owner')만
-- 확인하고 있었다 - 이 코드베이스 전역에서 관리자 역할로 취급하는 4개 레거시
-- role('company_owner','company_admin','hospital_owner','hospital_admin') 중
-- hospital_admin이 빠져 있었고, simple_role='admin' 폴백도 없었다. 현재 라이브
-- 데이터에는 hospital_owner/hospital_admin 계정이 없어 당장 영향은 없지만,
-- dashboard/settings 페이지의 회사 정보 수정 폼이 이 정책에 의존하므로 같은
-- 범위로 맞춰 둔다(팀 관리 등 다른 곳에서 반복적으로 나온 것과 같은 종류의
-- 불일치 - manager는 이 정책 범위에 포함하지 않음, 관리자 등급 전용 설정이므로).

DROP POLICY IF EXISTS "Company admins can update their company" ON companies;
CREATE POLICY "Company admins can update their company" ON companies
  FOR UPDATE
  USING (
    id IN (
      SELECT users.company_id FROM users
      WHERE users.id = auth.uid()
        AND (
          users.simple_role = 'admin'
          OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );
