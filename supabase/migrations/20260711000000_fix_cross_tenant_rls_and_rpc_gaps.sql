-- Migration: 런칭 전 최종 보안 감사에서 발견된 크로스테넌트 데이터 노출 수정
-- Created: 2026-07-11

-- =============================================================================
-- 1. users 테이블 SELECT 정책 — USING (true)로 인해 로그인만 하면 전 테넌트의
--    모든 사용자(이메일/전화번호/역할/is_super_admin 포함)를 열람 가능했다.
--    같은 회사 팀원 조회(팀 관리 화면, 담당자 배정 드롭다운 등)는 정상 동작해야
--    하므로, 무조건 차단이 아니라 같은 회사로 스코핑한다.
-- =============================================================================

-- users 테이블 자신을 정책 안에서 서브쿼리로 다시 읽으면(다른 테이블의
-- company_id 스코핑 정책과 달리) Postgres가 users 테이블의 RLS를 재귀적으로
-- 다시 평가하려 시도해 "infinite recursion detected in policy for relation
-- users" 에러로 users를 조회하는 거의 모든 화면이 깨진다. SECURITY DEFINER
-- 헬퍼 함수로 조회하면 함수 내부 쿼리는 RLS를 우회해 재귀가 끊긴다.
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.am_i_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM users WHERE id = auth.uid()), false)
$$;

DROP POLICY IF EXISTS "users_select_all_authenticated" ON users;

CREATE POLICY "users_select_same_company" ON users
  FOR SELECT
  USING (company_id = get_my_company_id());

-- 기존 DELETE 정책도 동일한 users 자기참조 서브쿼리 패턴이라 실제로 실행되면
-- 같은 재귀 에러가 났을 것이다(지금까지 이 경로가 거의 호출되지 않아 드러나지
-- 않았을 뿐). 동일한 헬퍼 함수로 교체해 선제적으로 고친다.
DROP POLICY IF EXISTS "users_delete_super_admin" ON users;
CREATE POLICY "users_delete_super_admin" ON users
  FOR DELETE
  USING (am_i_super_admin());

-- =============================================================================
-- 2. company_id 컬럼이 있는데도 회사 스코핑 없이 role만으로 전체 테넌트를
--    열람/수정 가능했던 관리자 정책 7개. company_subscriptions_admin에서
--    이미 한 번 고친 것과 동일한 결함이 플랫폼 전역에 반복되어 있었다.
-- =============================================================================

DROP POLICY IF EXISTS "payments_admin" ON payments;
CREATE POLICY "payments_admin" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = payments.company_id
    )
  );

DROP POLICY IF EXISTS "invoices_admin" ON invoices;
CREATE POLICY "invoices_admin" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = invoices.company_id
    )
  );

DROP POLICY IF EXISTS "api_usage_logs_admin" ON api_usage_logs;
CREATE POLICY "api_usage_logs_admin" ON api_usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = api_usage_logs.company_id
    )
  );

DROP POLICY IF EXISTS "error_logs_admin" ON error_logs;
CREATE POLICY "error_logs_admin" ON error_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = error_logs.company_id
    )
  );

DROP POLICY IF EXISTS "generated_reports_admin" ON generated_reports;
CREATE POLICY "generated_reports_admin" ON generated_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = generated_reports.company_id
    )
  );

DROP POLICY IF EXISTS "performance_goals_admin" ON performance_goals;
CREATE POLICY "performance_goals_admin" ON performance_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = performance_goals.company_id
    )
  );

DROP POLICY IF EXISTS "usage_logs_admin" ON usage_logs;
CREATE POLICY "usage_logs_admin" ON usage_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = usage_logs.company_id
    )
  );

-- =============================================================================
-- 3. company_id 컬럼 자체가 없어 테넌트 스코핑이 불가능한 테이블들.
--    role만으로 전체 테넌트에 열려있던 것을 슈퍼 어드민 전용으로 제한한다.
--    (일반 회사 관리자가 볼 이유가 없는 플랫폼 레벨 데이터)
-- =============================================================================

DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

DROP POLICY IF EXISTS "performance_metrics_admin" ON performance_metrics;
CREATE POLICY "performance_metrics_admin" ON performance_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- report_templates는 company_id는 없지만 created_by(uuid)가 있다. saved_reports와
-- 동일하게 "만든 사람이 속한 회사"로 스코핑한다.
DROP POLICY IF EXISTS "report_templates_admin" ON report_templates;
CREATE POLICY "report_templates_admin" ON report_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users creator
      JOIN users caller ON caller.company_id = creator.company_id
      WHERE creator.id = report_templates.created_by
      AND caller.id = auth.uid()
      AND caller.role IN ('company_owner', 'company_admin')
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- =============================================================================
-- 4. anon/authenticated 롤에 EXECUTE 권한이 열려있던 SECURITY DEFINER 함수 3개.
--    모두 RLS를 우회하며 호출자 권한을 전혀 검증하지 않아, 로그인조차 없이
--    임의의 회사의 리드 담당자를 변경하거나(auto_assign_lead) 리드 상태 코드를
--    생성하거나(insert_default_lead_statuses) 직원 목록을 조회(auto_assign_call_staff)
--    할 수 있었다. 애플리케이션 코드 어디에서도 클라이언트가 직접 호출하지
--    않는 것을 확인했으므로 anon/authenticated 실행 권한을 회수한다.
-- =============================================================================

-- PUBLIC에 대한 GRANT가 별도로 있어 anon/authenticated 개별 REVOKE만으로는
-- 부족하다 (PUBLIC 권한이 우선 적용되어 모든 롤에 실행 권한이 그대로 남는다).
REVOKE EXECUTE ON FUNCTION auto_assign_lead(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION insert_default_lead_statuses(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION auto_assign_call_staff(uuid) FROM PUBLIC, anon, authenticated;
