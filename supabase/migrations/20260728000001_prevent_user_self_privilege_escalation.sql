-- users_update_own RLS 정책(qual: id = auth.uid())에 WITH CHECK이 없어서,
-- 로그인한 사용자가 자기 자신의 행에 role/simple_role/is_super_admin/company_id/
-- is_active까지 포함해 아무 값이나 직접 PostgREST PATCH로 쓸 수 있었다.
-- 이를 이용하면 스스로를 super admin으로 만들거나, company_id를 다른 회사로
-- 바꿔 그 회사의 리드/랜딩페이지 등 전체 데이터에 접근할 수 있었다(다른 테이블의
-- RLS가 대부분 "company_id IN (SELECT company_id FROM users WHERE id = auth.uid())"
-- 형태로 users.company_id를 신뢰하기 때문). 트리거로 이 컬럼들의 자기 자신에 의한
-- 변경을 차단한다(service_role로 실행되는 관리자 API/백엔드 로직은 영향 없음).
CREATE OR REPLACE FUNCTION prevent_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
      OR NEW.simple_role IS DISTINCT FROM OLD.simple_role
      OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
      OR NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
    THEN
      RAISE EXCEPTION 'Cannot change role, company, or active status via self-update';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_privilege_escalation();
