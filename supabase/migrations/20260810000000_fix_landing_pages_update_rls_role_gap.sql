-- landing_pages UPDATE RLS 정책의 허용 역할 목록에 company_admin이 빠져있었다(레거시
-- hospital_admin은 포함돼 있었음) - 회사 관리자 팀원(company_admin)이 대시보드에서
-- 랜딩페이지 게시/중지를 토글해도 RLS가 0행으로 조용히 막았다. 하필 같은 화면의
-- UPDATE 호출이 count:'exact' 옵션으로 성공여부를 판단하고 있었는데, 이 옵션이 이
-- 프로젝트 환경의 UPDATE 체인에서 항상 null을 반환하는 별개의 버그(84~85차 QA)와
-- 겹쳐 실패가 전혀 드러나지 않고 토글만 조용히 원상복구됐다(85차 QA). company_id
-- 스코프/활성회사 조건은 그대로 두고 역할 조건만 넓힌다.

DROP POLICY "Staff can update landing pages" ON "landing_pages";
CREATE POLICY "Staff can update landing pages" ON "landing_pages"
  AS PERMISSIVE FOR UPDATE
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
