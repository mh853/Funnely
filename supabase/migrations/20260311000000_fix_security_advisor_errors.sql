-- ============================================================================
-- 보안 어드바이저 오류 수정
-- ============================================================================
-- 대상:
--   1. unassigned_leads_stats 뷰 - SECURITY DEFINER 제거 → SECURITY INVOKER
--   2. workflow_executions - RLS 활성화 (슈퍼어드민 전용 테이블)
--   3. workflow_action_logs - RLS 활성화 (슈퍼어드민 전용 테이블)
--   4. email_logs - RLS 활성화 (슈퍼어드민 전용 테이블)
--   5. bulk_operation_logs - RLS 활성화 (실행자 기반 접근 제어)
--   6. notification_sent_logs - RLS 활성화 (자사 구독 기반 접근 제어)
-- ============================================================================

-- ============================================================================
-- 1. unassigned_leads_stats 뷰 재생성 (SECURITY INVOKER로 변경)
-- ============================================================================
-- SECURITY DEFINER 뷰는 뷰 작성자의 권한으로 실행되어 RLS를 우회함
-- SECURITY INVOKER(기본값)로 재생성하면 조회하는 사용자의 권한/RLS가 적용됨
-- leads 테이블에 RLS가 걸려있으므로, 사용자는 자사 리드만 집계하게 됨
DROP VIEW IF EXISTS public.unassigned_leads_stats;

CREATE VIEW public.unassigned_leads_stats
WITH (security_invoker = true)
AS
SELECT
  company_id,
  COUNT(*) as unassigned_count,
  MIN(created_at) as oldest_lead,
  MAX(created_at) as newest_lead
FROM leads
WHERE call_assigned_to IS NULL
GROUP BY company_id;

COMMENT ON VIEW public.unassigned_leads_stats IS
  '회사별 미배정 리드 현황 (수동 분배 시스템 모니터링용) - security_invoker 적용';

-- ============================================================================
-- 2. workflow_executions - RLS 활성화
-- ============================================================================
-- automation_workflows에 company_id가 없으므로 슈퍼어드민만 접근
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- 슈퍼어드민은 전체 조회/수정 가능
CREATE POLICY "workflow_executions_super_admin_all"
  ON public.workflow_executions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

-- 시스템(service_role)은 모든 데이터 접근 가능 (크론 작업, 서버사이드 로직용)
CREATE POLICY "workflow_executions_service_role_all"
  ON public.workflow_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. workflow_action_logs - RLS 활성화
-- ============================================================================
ALTER TABLE public.workflow_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_action_logs_super_admin_all"
  ON public.workflow_action_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

CREATE POLICY "workflow_action_logs_service_role_all"
  ON public.workflow_action_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. email_logs - RLS 활성화
-- ============================================================================
-- email_logs에 company_id가 없으므로 슈퍼어드민 전용 접근
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_super_admin_select"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

-- service_role은 이메일 발송 시스템(서버사이드)에서 삽입에 사용
CREATE POLICY "email_logs_service_role_all"
  ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. bulk_operation_logs - RLS 활성화
-- ============================================================================
-- executed_by(users.id)를 통해 자사 직원의 작업만 조회
ALTER TABLE public.bulk_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bulk_operation_logs_select_own_company"
  ON public.bulk_operation_logs
  FOR SELECT
  TO authenticated
  USING (
    executed_by IN (
      SELECT u2.id FROM users u2
      WHERE u2.company_id = (
        SELECT u1.company_id FROM users u1 WHERE u1.id = auth.uid()
      )
    )
  );

-- 슈퍼어드민은 전체 접근
CREATE POLICY "bulk_operation_logs_super_admin_all"
  ON public.bulk_operation_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

CREATE POLICY "bulk_operation_logs_service_role_all"
  ON public.bulk_operation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. notification_sent_logs - RLS 활성화
-- ============================================================================
-- subscription_id를 통해 자사 구독에 대한 알림 로그만 조회
ALTER TABLE public.notification_sent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_sent_logs_select_own_company"
  ON public.notification_sent_logs
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT s.id FROM company_subscriptions s
      WHERE s.company_id = (
        SELECT u.company_id FROM users u WHERE u.id = auth.uid()
      )
    )
  );

-- 슈퍼어드민은 전체 접근
CREATE POLICY "notification_sent_logs_super_admin_all"
  ON public.notification_sent_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

-- service_role은 알림 발송 시스템(크론 작업)에서 삽입에 사용
CREATE POLICY "notification_sent_logs_service_role_all"
  ON public.notification_sent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
