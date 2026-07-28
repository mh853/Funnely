-- payment_audit_logs SELECT RLS 정책이 simple_role='admin'만 확인해, 레거시
-- role(company_owner/company_admin/hospital_owner/hospital_admin) 계정과
-- simple_role='manager' 계정은 실제 관리자인데도 결제 감사 로그를 하나도 못 본다.
-- api/leads/payments/audit/route.ts의 자체 role 체크를 isAdminUser() 기준으로
-- 맞춰도, 이 RLS까지 함께 고치지 않으면 403 대신 "로그 없음"(빈 배열)이라는
-- 잘못된 성공 응답으로 형태만 바뀔 뿐이라 함께 수정한다.

DROP POLICY IF EXISTS "Admins can view own company audit logs" ON payment_audit_logs;
CREATE POLICY "Admins can view own company audit logs"
  ON payment_audit_logs
  FOR SELECT
  USING (
    company_id IN (
      SELECT users.company_id FROM users
      WHERE users.id = auth.uid()
        AND (
          users.simple_role IN ('admin', 'manager')
          OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );
