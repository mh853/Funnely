-- prevent_self_privilege_escalation()이 "대상(OLD.role)이 이미 owner/admin급이면
-- 이 경로로는 아예 손대지 못하게" 막는 것으로 팀원 보호를 구현했는데, NEW.role이
-- 무엇으로 바뀌는지는 전혀 검사하지 않았다. 그 결과 company_admin(caller_is_admin
-- 통과)이 non-owner 팀원(OLD.role이 owner/admin이 아님) 행을 골라 NEW.role을
-- 'company_owner'로 직접 UPDATE하면 트리거를 그대로 통과했다(68차 QA 확인).
-- 앱 UI(TeamMemberDetailModal.tsx)는 애초에 user/manager/admin 3가지만
-- 선택지로 제공하고 owner는 절대 노출하지 않으므로, 이 경로로 owner 승격이
-- 성공하는 것은 브라우저 콘솔로 직접 호출한 우회 공격 경로만 존재한다는 뜻이다.
-- 팀 관리 경로로는 owner 승격 자체를 원천 차단한다.

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

    -- NEW.role도 owner급이면 차단 - 팀 관리 화면은 owner를 선택지로 제공한 적이
    -- 없고(user/manager/admin 3종뿐), 이 경로로 owner를 부여할 앱 상의 정당한
    -- 사유가 없다(68차 QA 확인 - company_admin이 non-owner 팀원을 owner로
    -- 직접 승격시키는 것이 이전에는 통과됐음).
    IF NEW.role IN ('company_owner', 'hospital_owner') THEN
      RAISE EXCEPTION 'Cannot grant owner role via team management';
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
