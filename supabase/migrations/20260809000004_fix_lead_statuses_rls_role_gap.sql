-- lead_statuses의 INSERT/UPDATE/DELETE RLS 정책이 simple_role='admin'만 허용해,
-- 앱 코드(isAdminUser() - simple_role='admin' 또는 'manager', 혹은 레거시
-- company_owner/company_admin/hospital_owner/hospital_admin role)가 관리자로
-- 인정하는 manager/레거시 역할 계정은 화면에서 "삭제 완료" 토스트를 받고도 실제로는
-- RLS가 0행을 조용히 걸러 아무 것도 바뀌지 않았다(77차 QA - 71차에서 다른 테이블
-- (sheet_sync_configs)에 발견됐던 것과 동일한 계열의 RLS-앱코드 기준 불일치).
-- 세 정책 모두 기존 company_id 스코프/활성회사 조건은 그대로 두고 역할 조건만 넓힌다.

DROP POLICY IF EXISTS "Admins can delete statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can delete statuses" ON "lead_statuses";
CREATE POLICY "Admins can delete statuses" ON "lead_statuses"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role OR users.simple_role = 'manager'::simple_user_role OR users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))
    AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL)))))))
  );

DROP POLICY IF EXISTS "Admins can insert statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can insert statuses" ON "lead_statuses";
CREATE POLICY "Admins can insert statuses" ON "lead_statuses"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role OR users.simple_role = 'manager'::simple_user_role OR users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))
    AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL)))))))
  );

-- 회사당 기본상태(is_default)가 동시에 2개 이상 존재할 수 없도록 DB 레벨에서 강제한다.
-- 앱 코드(PATCH /api/lead-statuses)가 "다른 기본값 해제 → 자신을 기본값으로" 2단계
-- 별도 쿼리로 처리해, 두 관리자가 거의 동시에 서로 다른 상태를 기본값으로 지정하면
-- 애플리케이션 레벨 순서만으로는 막을 수 없었다(77차 QA). 이 인덱스가 있으면 두 번째
-- 쿼리가 유니크 제약 위반으로 실패해 명확한 에러를 반환한다.
CREATE UNIQUE INDEX IF NOT EXISTS lead_statuses_one_default_per_company
  ON lead_statuses (company_id)
  WHERE is_default = true;

DROP POLICY IF EXISTS "Admins can update statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can update statuses" ON "lead_statuses";
CREATE POLICY "Admins can update statuses" ON "lead_statuses"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role OR users.simple_role = 'manager'::simple_user_role OR users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))
    AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL)))))))
  );
