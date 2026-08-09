-- 82차 QA: audit_logs/bulk_operation_logs의 super_admin RLS 정책이 FOR ALL(SELECT/
-- INSERT/UPDATE/DELETE 전부)이라, super_admin 세션으로 직접 REST API를 호출하면
-- 자기 자신의 감사기록을 수정/삭제할 수 있었다. 실제 앱의 쓰기 경로는 전부
-- service_role 클라이언트를 쓰고 있어(RLS 우회) authenticated 세션의 쓰기 권한은
-- 애초에 필요 없다 - payment_audit_logs/company_activity_logs와 동일하게
-- SELECT 전용으로 좁힌다. 조회는 그대로 유지되어 기존 어드민 화면(감사로그 조회,
-- 벌크작업 이력 조회)에는 영향 없다.

DROP POLICY "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

DROP POLICY "bulk_operation_logs_super_admin_all" ON public.bulk_operation_logs;
CREATE POLICY "bulk_operation_logs_super_admin_all"
  ON public.bulk_operation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

-- saved_reports는 앱 UI/API 어디에도 연결되지 않은 미완성 기능이지만, 최초 생성
-- 정책("Users can manage their own reports")이 company_id 검증 없이 created_by만
-- 확인해 로그인한 사용자가 REST API를 직접 호출하면 임의 company_id로 행을
-- 쓸 수 있었다(82차 QA). 다른 테이블들과 동일한 패턴으로 소속 회사 검증을 추가한다.
DROP POLICY "Users can manage their own reports" ON saved_reports;
CREATE POLICY "Users can manage their own reports" ON saved_reports
  FOR ALL USING (
    created_by = auth.uid()
    AND company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
  );
