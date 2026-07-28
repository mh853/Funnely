-- 팀 관리 화면(TeamMemberDetailModal.tsx)이 팀원의 role/department/is_active를
-- 브라우저에서 users 테이블에 직접 UPDATE하는데, users_update_own 정책이
-- id = auth.uid()만 허용해 관리자가 "본인 아닌" 팀원을 수정하면 항상 0행
-- 업데이트로 실패했다(팀원 관리 기능이 사실상 전혀 동작하지 않음).
--
-- 이전 마이그레이션(20260728000001)에서 추가한 자기 권한상승 방지 트리거는
-- "인증된 사용자가 수정하는 모든 users 행"에 대해 무조건 role/simple_role/
-- company_id/is_super_admin/is_active 변경을 막고 있어서, 이번에 RLS만 열어주면
-- 트리거가 계속 막아버린다. 트리거를 "자기 자신 행"과 "관리자가 같은 회사의
-- non-owner 팀원 행을 고치는 경우"로 분리해서, 후자는 관리자 자격과 대상이
-- owner/admin급이 아닌지를 트리거 안에서 재검증한 뒤에만 허용한다
-- (company_id/is_super_admin은 이 경로로도 항상 변경 불가 - RLS만으로는 회사
-- 관리자가 실수로/악의적으로 팀원을 다른 회사로 옮기거나 super admin으로 만드는
-- 것까지 막기 어려워 트리거에서 이중으로 차단).

CREATE OR REPLACE FUNCTION prevent_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF OLD.id = auth.uid() THEN
    -- 자기 자신의 행: 이 컬럼들은 어떤 경우에도 셀프 변경 불가
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.simple_role IS DISTINCT FROM OLD.simple_role
      OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
      OR NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
    THEN
      RAISE EXCEPTION 'Cannot change role, company, or active status via self-update';
    END IF;
    RETURN NEW;
  END IF;

  -- 다른 사용자(팀원)의 행: company_id/is_super_admin은 이 경로로 항상 불가
  IF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'Cannot change company or super admin status via team management';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.simple_role IS DISTINCT FROM OLD.simple_role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- 대상이 owner/admin급이면 이 경로로는 절대 수정 불가(가장 안전한 기본값 -
    -- "마지막 관리자 보호" 같은 세밀한 로직 없이도 관리자급 계정은 아예 건드릴 수 없게 함)
    IF OLD.role IN ('company_owner', 'hospital_owner') OR OLD.simple_role = 'admin' THEN
      RAISE EXCEPTION 'Cannot change role/status of an owner or admin-level user via team management';
    END IF;

    SELECT (simple_role = 'admin' OR role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'))
      INTO caller_is_admin
      FROM users
      WHERE id = auth.uid() AND company_id = OLD.company_id;

    IF NOT COALESCE(caller_is_admin, false) THEN
      RAISE EXCEPTION 'Not authorized to change this user''s role or status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 같은 회사의 관리자가 non-owner/non-admin 팀원 행을 UPDATE할 수 있도록 행 단위
-- 접근 자체를 허용(컬럼별 세부 제약은 위 트리거가 담당). department 등 무해한
-- 필드만 바꾸는 경우도 이 정책을 통해 통과한다.
DROP POLICY IF EXISTS "company_admins_can_update_team_members" ON users;
CREATE POLICY "company_admins_can_update_team_members" ON users
  FOR UPDATE
  USING (
    company_id = get_my_company_id()
    AND id <> auth.uid()
    AND am_i_admin_or_legacy_owner()
    AND NOT (role IN ('company_owner', 'hospital_owner') OR simple_role = 'admin')
  )
  WITH CHECK (
    company_id = get_my_company_id()
  );
