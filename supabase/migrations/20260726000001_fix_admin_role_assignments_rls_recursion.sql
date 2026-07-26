-- admin_role_assignments/admin_roles의 RLS 정책이 자기 자신(admin_role_assignments)을
-- 조회하는 서브쿼리를 그대로 USING 절에 써서, 정책 평가 자체가 같은 정책을 무한히
-- 재귀 호출하는 문제(Postgres 42P17 infinite recursion detected in policy)가 있었다.
-- /api/admin/email-templates가 서비스 롤이 아닌 일반 서버 클라이언트(RLS 적용)로
-- 이 테이블을 조회하다가 매번 500 에러로 실패하던 것이 이 버그의 실제 증상이다.
-- 다른 어드민 라우트들은 서비스 롤 클라이언트를 써서 RLS를 우회하므로 증상이
-- 드러나지 않았을 뿐, 정책 자체는 여전히 깨져 있었다.
--
-- SECURITY DEFINER 함수로 같은 조회를 감싸면 함수 내부 쿼리는 RLS를 우회하므로
-- 재귀가 끊긴다(이미 존재하는 am_i_super_admin()과 동일한 패턴, 다만 이 함수는
-- users.is_super_admin이 아니라 admin_role_assignments/admin_roles RBAC 코드를
-- 검사하므로 별도로 만든다).

CREATE OR REPLACE FUNCTION public.is_super_admin_via_role_assignment()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM admin_role_assignments ara
    JOIN admin_roles ar ON ara.role_id = ar.id
    WHERE ara.user_id = auth.uid() AND ar.code = 'super_admin'
  )
$function$;

DROP POLICY IF EXISTS "Super admins can manage role assignments" ON admin_role_assignments;
CREATE POLICY "Super admins can manage role assignments" ON admin_role_assignments
  FOR ALL
  USING (public.is_super_admin_via_role_assignment());

DROP POLICY IF EXISTS "Super admins can manage admin roles" ON admin_roles;
CREATE POLICY "Super admins can manage admin roles" ON admin_roles
  FOR ALL
  USING (public.is_super_admin_via_role_assignment());
