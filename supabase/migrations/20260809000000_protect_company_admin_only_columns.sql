-- companies UPDATE RLS 정책(20260728000005)이 행 소유권(row ownership)만 확인하고
-- WITH CHECK/컬럼 제한이 전혀 없어, 회사 설정 폼(CompanySettingsForm.tsx)이 세션
-- 클라이언트로 이름/사업자번호/주소/전화 4개 필드만 보내는 것과 별개로 회사 관리자
-- 권한(company_owner/company_admin 등)만 있으면 브라우저 콘솔에서 is_active/
-- withdrawn_at까지 임의로 덮어쓸 수 있었다. is_active/withdrawn_at은 관리자가 회사를
-- 정지시키는 유일한 필드(middleware.ts 접근차단이 이 값에만 의존)라, 정지된 회사의
-- owner가 스스로 정지를 해제하는 우회 경로가 됐다(73차 QA 확인). short_id도 URL
-- 라우팅에 쓰이는 관리자 전용 값이라 같이 보호한다.
CREATE OR REPLACE FUNCTION prevent_company_self_service_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role(관리자 API)은 RLS를 우회하지만 트리거는 우회하지 않으므로 여기서
  -- 명시적으로 통과시켜야 한다 - 그 외(authenticated 세션)만 이 제약을 적용한다.
  IF auth.role() <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at
    OR NEW.short_id IS DISTINCT FROM OLD.short_id
  THEN
    RAISE EXCEPTION 'Cannot change is_active, withdrawn_at, or short_id via company settings';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_company_self_service_field_changes ON companies;
CREATE TRIGGER trigger_prevent_company_self_service_field_changes
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_company_self_service_field_changes();
