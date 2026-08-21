-- 86차 QA: "RLS role 배열이 항상 불완전함" 반복 버그 클래스(1~85차에 9회+ 재발,
-- claudedocs/qa-loop-recurring-patterns.md 패턴#1)를 겨냥한 전수조사 결과 발견된
-- 나머지 인스턴스를 한 번에 정리한다. 회사 관리자로 인정되는 역할 집합
-- (simple_role='admin'/'manager' 또는 레거시 role 4종)이 SQL 정책마다 손으로
-- 재작성되다 특정 역할이 계속 빠지는 패턴이다. 원본 정책 텍스트(pg_policies에서
-- 그대로 조회)에 역할만 추가하는 기계적 치환으로 문법오류 위험을 없앤다.

-- 1) sheet_sync_configs: simple_role='admin'만 확인 - manager와 레거시 role 4종이
-- 전부 빠져있었다. 실DB 조회로 활성 계정 3개(company_owner/simple_role=user)가
-- 지금 이 순간 조회는 빈 목록, 등록은 에러, 활성화토글/삭제는 조용히 무시당하고
-- 있음을 확인했다. isAdminUser()와 정확히 일치하도록 확장한다(77차와 동일 패턴).
DROP POLICY IF EXISTS "Admins can manage sheet sync configs" ON "sheet_sync_configs";
DROP POLICY IF EXISTS "Admins can manage sheet sync configs" ON "sheet_sync_configs";
CREATE POLICY "Admins can manage sheet sync configs" ON "sheet_sync_configs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_configs.company_id) AND (users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role OR users.simple_role = 'manager'::simple_user_role OR users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

-- 2) landing_pages INSERT/DELETE: 85차에 UPDATE(게시/중지 토글)만 고쳤는데 같은
-- 테이블의 INSERT/DELETE에도 동일하게 company_admin이 빠져있었다.
DROP POLICY IF EXISTS "Staff can insert landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can insert landing pages" ON "landing_pages";
CREATE POLICY "Staff can insert landing pages" ON "landing_pages"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can delete landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can delete landing pages" ON "landing_pages";
CREATE POLICY "Staff can delete landing pages" ON "landing_pages"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

-- 3) company_custom_domains: role 조건 자체가 없어(company_id 소속 여부만 확인)
-- viewer/marketing_staff 등 최하위 권한도 회사 전체 랜딩페이지 라우팅에 영향을
-- 주는 커스텀 도메인 추가/삭제/기본도메인 지정이 가능했다. 도메인 관리는
-- companies UPDATE와 동일한 관리자 전용 기준(isAdminUser())으로 제한한다.
DROP POLICY IF EXISTS "company_members_manage_custom_domains" ON "company_custom_domains";
DROP POLICY IF EXISTS "company_members_manage_custom_domains" ON "company_custom_domains";
CREATE POLICY "company_members_manage_custom_domains" ON "company_custom_domains"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role OR users.simple_role = 'manager'::simple_user_role OR users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

-- 4) ad_accounts/campaigns/form_templates: 전부 AD_INTEGRATION_ENABLED/
-- FORM_BUILDER_ENABLED 기능플래그로 현재 비활성화돼 있어 당장 도달 불가능하지만,
-- campaigns의 앱 코드는 이미 company_owner/company_admin을 명시적으로 허용한다고
-- 체크하면서 RLS는 막고 있어 기능이 재활성화되는 순간 즉시 터지는 시한폭탄이었다.
-- 같은 클래스의 수정이라 이번에 함께 닫아둔다.
DROP POLICY IF EXISTS "Managers can manage ad accounts" ON "ad_accounts";
DROP POLICY IF EXISTS "Managers can manage ad accounts" ON "ad_accounts";
CREATE POLICY "Managers can manage ad accounts" ON "ad_accounts"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can manage campaigns" ON "campaigns";
DROP POLICY IF EXISTS "Staff can manage campaigns" ON "campaigns";
CREATE POLICY "Staff can manage campaigns" ON "campaigns"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((ad_account_id IN ( SELECT ad_accounts.id
   FROM ad_accounts
  WHERE (ad_accounts.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Managers can manage form templates" ON "form_templates";
DROP POLICY IF EXISTS "Managers can manage form templates" ON "form_templates";
CREATE POLICY "Managers can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Marketing staff can manage form templates" ON "form_templates";
DROP POLICY IF EXISTS "Marketing staff can manage form templates" ON "form_templates";
CREATE POLICY "Marketing staff can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id AS hospital_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );
