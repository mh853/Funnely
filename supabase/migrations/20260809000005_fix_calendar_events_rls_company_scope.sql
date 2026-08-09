-- calendar_events의 "Users can manage their events"(FOR ALL)와 "Users can view their
-- assigned events"(SELECT) 두 정책 모두 created_by = auth.uid() 분기에 회사(hospital_id)
-- 스코프 검증이 없었다. Next.js API는 hospital_id를 항상 서버측 프로필에서 강제하므로
-- 앱 UI로는 도달 불가하지만, 세션 토큰으로 PostgREST를 직접 호출하면 임의 hospital_id +
-- 자신의 uid로 타사 캘린더에 쓰기/조회가 가능했다(78차 QA, defense-in-depth 결여).
-- created_by 분기에도 caller의 company_id가 그 행의 hospital_id와 일치해야 한다는
-- 조건을 추가한다. (원본 정책 텍스트를 pg_policies에서 그대로 가져와 마커 문자열만
-- 기계적으로 치환 - 68차/71차 등에서 쓴 것과 동일한 안전한 방식)

DROP POLICY "Users can manage their events" ON "calendar_events";
CREATE POLICY "Users can manage their events" ON "calendar_events"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id))))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY "Users can view their assigned events" ON "calendar_events";
CREATE POLICY "Users can view their assigned events" ON "calendar_events"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (((auth.uid() = ANY (assigned_to)) OR ((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id))))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
           FROM companies
          WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );
