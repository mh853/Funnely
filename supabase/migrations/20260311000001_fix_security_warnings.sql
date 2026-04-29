-- ============================================================================
-- 보안 어드바이저 경고 수정
-- ============================================================================
-- 대상:
--   [function_search_path_mutable] 9개 함수에 search_path 고정
--   [rls_policy_always_true] 과도하게 허용적인 RLS 정책 수정
-- ============================================================================

-- ============================================================================
-- 1. Function search_path 고정 (Search Path Injection 방지)
-- ============================================================================
-- search_path가 고정되지 않으면 동일 스키마에 동명 객체를 생성해 함수 실행을
-- 가로채는 공격이 가능함. SET search_path = '' 또는 'public'으로 고정.

ALTER FUNCTION public.notify_new_lead() SET search_path = public;
ALTER FUNCTION public.handle_auth_signin() SET search_path = public;
ALTER FUNCTION public.update_support_ticket_replies_updated_at() SET search_path = public;
ALTER FUNCTION public.update_ticket_status_on_reply() SET search_path = public;
ALTER FUNCTION public.update_phone_blacklist_updated_at() SET search_path = public;
ALTER FUNCTION public.create_support_reply_notification() SET search_path = public;
ALTER FUNCTION public.create_subscription_notification() SET search_path = public;
ALTER FUNCTION public.notify_admins_new_ticket() SET search_path = public;
ALTER FUNCTION public.get_company_name(support_tickets) SET search_path = public;

-- ============================================================================
-- 2. users 테이블 - users_insert_super_admin / users_delete_super_admin 수정
-- ============================================================================
-- 기존 정책: WITH CHECK (true) / USING (true) → 모든 authenticated 사용자 가능
-- 수정: is_super_admin = true 인 사용자만 허용

DROP POLICY IF EXISTS "users_insert_super_admin" ON public.users;
CREATE POLICY "users_insert_super_admin"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;
CREATE POLICY "users_delete_super_admin"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_super_admin = true
    )
  );

-- ============================================================================
-- 3. company_activity_logs - "System can insert activity logs" 수정
-- ============================================================================
-- 기존: WITH CHECK (true) → authenticated 롤이 아무 행이나 삽입 가능
-- 수정: 자신의 회사에 대한 활동 로그만 삽입 가능

DROP POLICY IF EXISTS "System can insert activity logs" ON public.company_activity_logs;
CREATE POLICY "System can insert activity logs"
  ON public.company_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 4. support_ticket_messages - "Authenticated users can create ticket messages" 수정
-- ============================================================================
-- 기존: WITH CHECK (true) → 모든 인증 사용자가 어떤 티켓에도 메시지 삽입 가능
-- 수정: 티켓이 자신의 회사에 속한 경우만 허용

DROP POLICY IF EXISTS "Authenticated users can create ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Authenticated users can create ticket messages"
  ON public.support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 5. support_ticket_status_history - "System can insert status history" 수정
-- ============================================================================
-- 기존: WITH CHECK (true) → 모든 인증 사용자가 임의 상태 이력 삽입 가능
-- 수정: 슈퍼어드민만 허용 (상태 변경은 시스템/관리자만 해야 함)

DROP POLICY IF EXISTS "System can insert status history" ON public.support_ticket_status_history;
CREATE POLICY "System can insert status history"
  ON public.support_ticket_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND is_super_admin = true
    )
  );

-- ============================================================================
-- 참고: 아래 두 정책은 실제로 무해하여 수정하지 않음
-- ============================================================================
-- notifications: "Service role can insert notifications"
--   → roles: ["-"] 는 service_role을 의미하며, service_role은 RLS를 우회함
--   → WITH CHECK (true)가 있어도 실질적 보안 위험 없음
--
-- sheet_sync_logs: "Service role can insert sync logs"
--   → 동일한 이유로 무해
-- ============================================================================

-- ============================================================================
-- 참고: auth_leaked_password_protection
-- ============================================================================
-- Supabase 대시보드에서만 변경 가능 (마이그레이션 불가)
-- Authentication → Sign In / Up → Password Strength → Leaked Password Protection 활성화
-- ============================================================================
