-- users 테이블의 INSERT 정책이 자기 자신(users)을 조회하는 서브쿼리를 WITH CHECK절에
-- 직접 써서, admin_role_assignments/admin_roles와 동일한 재귀 위험 패턴을 갖고 있었다.
-- 현재는 users insert를 호출하는 3곳(signup, team/invite, users/invite/accept)이 전부
-- 서비스 롤 클라이언트를 써서 RLS를 우회하므로 당장 문제가 되지는 않지만(dormant),
-- 이미 존재하는 am_i_super_admin() SECURITY DEFINER 함수(같은 users 테이블의 DELETE
-- 정책은 이미 이 함수를 사용 중)로 교체해 잠재적 재귀 위험을 없앤다.

DROP POLICY IF EXISTS users_insert_super_admin ON users;
CREATE POLICY users_insert_super_admin ON users
  FOR INSERT
  WITH CHECK (public.am_i_super_admin());
