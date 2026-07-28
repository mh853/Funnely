-- company_invitations의 INSERT/UPDATE/DELETE RLS 정책이 simple_role='admin'만
-- 확인해, 앱 코드(api/users/invite/route.ts)가 허용하는 레거시 role(company_owner/
-- company_admin/hospital_owner/hospital_admin)을 가진 계정은 앱 레벨 검사는
-- 통과하고도 실제 INSERT/UPDATE/DELETE가 RLS에서 거부됐다. 라이브 확인 결과
-- role='company_owner', simple_role='user'인 실제 계정 3건이 이 버그로 초대
-- 링크 생성 자체가 항상 실패하고 있었다. 앱의 create/delete 핸들러가 쓰는
-- 정확히 같은 조건(manager는 미포함 - 앱도 create/delete는 admin만 허용)으로 통일.
--
-- get_my_company_id()/am_i_super_admin()처럼 이 코드베이스가 이미 쓰는
-- SECURITY DEFINER 헬퍼 함수 패턴을 그대로 따른다(정책 안에 직접 서브쿼리를
-- 넣는 대신) - 같은 패턴이 다른 테이블에서 이미 안정적으로 동작 중이다.
CREATE OR REPLACE FUNCTION am_i_admin_or_legacy_owner()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT simple_role = 'admin'
       OR role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
     FROM users WHERE id = auth.uid()),
    false
  )
$$;

DROP POLICY IF EXISTS "Admins can create invitations" ON company_invitations;
CREATE POLICY "Admins can create invitations" ON company_invitations
  FOR INSERT
  WITH CHECK (
    company_id = get_my_company_id()
    AND am_i_admin_or_legacy_owner()
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON company_invitations;
CREATE POLICY "Admins can update invitations" ON company_invitations
  FOR UPDATE
  USING (
    company_id = get_my_company_id()
    AND am_i_admin_or_legacy_owner()
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON company_invitations;
CREATE POLICY "Admins can delete invitations" ON company_invitations
  FOR DELETE
  USING (
    company_id = get_my_company_id()
    AND am_i_admin_or_legacy_owner()
  );

-- SELECT 정책도 레거시 role 미포함 - INSERT는 통과해도, 앱 코드가 생성 직후
-- .select()로 방금 만든 초대를 다시 읽어오는데(api/users/invite/route.ts:79-90),
-- 그 SELECT가 이 정책에서 막혀 초대 생성 자체가 실패로 보고됐다(PostgREST의
-- return=representation이 SELECT 가시성에 의존하기 때문 - 라이브 테스트로
-- 직접 재현 후 확인한 원인). manager는 기존 정책에 이미 포함되어 있었으므로 유지.
DROP POLICY IF EXISTS "Admins can view company invitations" ON company_invitations;
CREATE POLICY "Admins can view company invitations" ON company_invitations
  FOR SELECT
  USING (
    company_id = get_my_company_id()
    AND (
      am_i_admin_or_legacy_owner()
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND simple_role = 'manager')
    )
  );

DROP FUNCTION IF EXISTS debug_check_invitation_policy(uuid, uuid);
