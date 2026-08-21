-- 74차 QA: 68차가 "팀원 개별 비활성화"는 86개 정책에 반영했지만 "회사 자체"
-- 정지/탈퇴(companies.is_active=false 또는 withdrawn_at)는 어디에도 검사하지
-- 않는 동일 규모의 누락이었다. 관리자가 회사를 정지시켜도(소속 users.is_active는
-- 그대로 true) 팀원들은 미들웨어를 거치지 않는 브라우저->Supabase 직접 호출로
-- 68차가 고친 것과 동일한 45개 테이블 전부에 계속 접근 가능했다.
--
-- 68차와 동일한 방식(DROP+CREATE, USING/WITH CHECK 원문은 pg_policies에서 그대로
-- 가져옴)으로, 이미 68차가 추가한 "caller가 is_active=true인 활성 사용자" 조건
-- 서브쿼리에 "그 사용자의 company_id가 활성 회사에 속한다"는 조건 하나만 추가한다.
-- 대상 테이블의 company_id 컬럼명이나 FK 구조를 몰라도 되도록, 항상 caller
-- 자신의(auth.uid()) users.company_id -> companies.is_active만 확인한다(대상 행의
-- company_id와 무관 - 어차피 그 행 자체도 같은 회사 소속이어야 이 정책을 통과한
-- 상태이므로 caller 회사가 활성인지만 확인하면 충분).

DROP POLICY IF EXISTS "Managers can manage ad accounts" ON "ad_accounts";
DROP POLICY IF EXISTS "Managers can manage ad accounts" ON "ad_accounts";
CREATE POLICY "Managers can manage ad accounts" ON "ad_accounts"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view ad accounts in their company" ON "ad_accounts";
DROP POLICY IF EXISTS "Users can view ad accounts in their company" ON "ad_accounts";
CREATE POLICY "Users can view ad accounts in their company" ON "ad_accounts"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Company owners and admins can insert credentials" ON "api_credentials";
DROP POLICY IF EXISTS "Company owners and admins can insert credentials" ON "api_credentials";
CREATE POLICY "Company owners and admins can insert credentials" ON "api_credentials"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Company owners and admins can update credentials" ON "api_credentials";
DROP POLICY IF EXISTS "Company owners and admins can update credentials" ON "api_credentials";
CREATE POLICY "Company owners and admins can update credentials" ON "api_credentials"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Company owners can delete credentials" ON "api_credentials";
DROP POLICY IF EXISTS "Company owners can delete credentials" ON "api_credentials";
CREATE POLICY "Company owners can delete credentials" ON "api_credentials"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view own company credentials" ON "api_credentials";
DROP POLICY IF EXISTS "Users can view own company credentials" ON "api_credentials";
CREATE POLICY "Users can view own company credentials" ON "api_credentials"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "api_usage_logs_admin" ON "api_usage_logs";
DROP POLICY IF EXISTS "api_usage_logs_admin" ON "api_usage_logs";
CREATE POLICY "api_usage_logs_admin" ON "api_usage_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = api_usage_logs.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "bulk_operation_logs_select_own_company" ON "bulk_operation_logs";
DROP POLICY IF EXISTS "bulk_operation_logs_select_own_company" ON "bulk_operation_logs";
CREATE POLICY "bulk_operation_logs_select_own_company" ON "bulk_operation_logs"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((executed_by IN ( SELECT u2.id
   FROM users u2
  WHERE (u2.company_id = ( SELECT u1.company_id
           FROM users u1
          WHERE (u1.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can manage their events" ON "calendar_events";
DROP POLICY IF EXISTS "Users can manage their events" ON "calendar_events";
CREATE POLICY "Users can manage their events" ON "calendar_events"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their assigned events" ON "calendar_events";
DROP POLICY IF EXISTS "Users can view their assigned events" ON "calendar_events";
CREATE POLICY "Users can view their assigned events" ON "calendar_events"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (((auth.uid() = ANY (assigned_to)) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view metrics in their company" ON "campaign_metrics";
DROP POLICY IF EXISTS "Users can view metrics in their company" ON "campaign_metrics";
CREATE POLICY "Users can view metrics in their company" ON "campaign_metrics"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((campaign_id IN ( SELECT c.id
   FROM (campaigns c
     JOIN ad_accounts aa ON ((c.ad_account_id = aa.id)))
  WHERE (aa.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can manage campaigns" ON "campaigns";
DROP POLICY IF EXISTS "Staff can manage campaigns" ON "campaigns";
CREATE POLICY "Staff can manage campaigns" ON "campaigns"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((ad_account_id IN ( SELECT ad_accounts.id
   FROM ad_accounts
  WHERE (ad_accounts.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view campaigns in their company" ON "campaigns";
DROP POLICY IF EXISTS "Users can view campaigns in their company" ON "campaigns";
CREATE POLICY "Users can view campaigns in their company" ON "campaigns"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((ad_account_id IN ( SELECT ad_accounts.id
   FROM ad_accounts
  WHERE (ad_accounts.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON "company_activity_logs";
DROP POLICY IF EXISTS "System can insert activity logs" ON "company_activity_logs";
CREATE POLICY "System can insert activity logs" ON "company_activity_logs"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "company_members_manage_custom_domains" ON "company_custom_domains";
DROP POLICY IF EXISTS "company_members_manage_custom_domains" ON "company_custom_domains";
CREATE POLICY "company_members_manage_custom_domains" ON "company_custom_domains"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can view company invitations" ON "company_invitations";
DROP POLICY IF EXISTS "Admins can view company invitations" ON "company_invitations";
CREATE POLICY "Admins can view company invitations" ON "company_invitations"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id = get_my_company_id()) AND (am_i_admin_or_legacy_owner() OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'manager'::simple_user_role))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "company_subscriptions_admin" ON "company_subscriptions";
DROP POLICY IF EXISTS "company_subscriptions_admin" ON "company_subscriptions";
CREATE POLICY "company_subscriptions_admin" ON "company_subscriptions"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))) AND (users.company_id = company_subscriptions.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "company_subscriptions_select_members" ON "company_subscriptions";
DROP POLICY IF EXISTS "company_subscriptions_select_members" ON "company_subscriptions";
CREATE POLICY "company_subscriptions_select_members" ON "company_subscriptions"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "error_logs_admin" ON "error_logs";
DROP POLICY IF EXISTS "error_logs_admin" ON "error_logs";
CREATE POLICY "error_logs_admin" ON "error_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = error_logs.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Marketing staff can manage external collection pages" ON "external_collection_pages";
DROP POLICY IF EXISTS "Marketing staff can manage external collection pages" ON "external_collection_pages";
CREATE POLICY "Marketing staff can manage external collection pages" ON "external_collection_pages"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view external collection pages in their company" ON "external_collection_pages";
DROP POLICY IF EXISTS "Users can view external collection pages in their company" ON "external_collection_pages";
CREATE POLICY "Users can view external collection pages in their company" ON "external_collection_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Managers can manage form templates" ON "form_templates";
DROP POLICY IF EXISTS "Managers can manage form templates" ON "form_templates";
CREATE POLICY "Managers can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Marketing staff can manage form templates" ON "form_templates";
DROP POLICY IF EXISTS "Marketing staff can manage form templates" ON "form_templates";
CREATE POLICY "Marketing staff can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id AS hospital_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view form templates in their company" ON "form_templates";
DROP POLICY IF EXISTS "Users can view form templates in their company" ON "form_templates";
CREATE POLICY "Users can view form templates in their company" ON "form_templates"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "generated_reports_admin" ON "generated_reports";
DROP POLICY IF EXISTS "generated_reports_admin" ON "generated_reports";
CREATE POLICY "generated_reports_admin" ON "generated_reports"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = generated_reports.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "invoices_admin" ON "invoices";
DROP POLICY IF EXISTS "invoices_admin" ON "invoices";
CREATE POLICY "invoices_admin" ON "invoices"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = invoices.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Marketing staff can view analytics" ON "landing_page_analytics";
DROP POLICY IF EXISTS "Marketing staff can view analytics" ON "landing_page_analytics";
CREATE POLICY "Marketing staff can view analytics" ON "landing_page_analytics"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((landing_page_id IN ( SELECT landing_pages.id
   FROM landing_pages
  WHERE (landing_pages.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can delete landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can delete landing pages" ON "landing_pages";
CREATE POLICY "Staff can delete landing pages" ON "landing_pages"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can insert landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can insert landing pages" ON "landing_pages";
CREATE POLICY "Staff can insert landing pages" ON "landing_pages"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can update landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can update landing pages" ON "landing_pages";
CREATE POLICY "Staff can update landing pages" ON "landing_pages"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can view landing pages" ON "landing_pages";
DROP POLICY IF EXISTS "Staff can view landing pages" ON "landing_pages";
CREATE POLICY "Staff can view landing pages" ON "landing_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view landing pages in their company" ON "landing_pages";
DROP POLICY IF EXISTS "Users can view landing pages in their company" ON "landing_pages";
CREATE POLICY "Users can view landing pages in their company" ON "landing_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can create notes for their leads" ON "lead_notes";
DROP POLICY IF EXISTS "Users can create notes for their leads" ON "lead_notes";
CREATE POLICY "Users can create notes for their leads" ON "lead_notes"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((user_id = auth.uid()) AND (lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can delete notes for leads in their company" ON "lead_notes";
DROP POLICY IF EXISTS "Users can delete notes for leads in their company" ON "lead_notes";
CREATE POLICY "Users can delete notes for leads in their company" ON "lead_notes"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view notes for leads in their hospital" ON "lead_notes";
DROP POLICY IF EXISTS "Users can view notes for leads in their hospital" ON "lead_notes";
CREATE POLICY "Users can view notes for leads in their hospital" ON "lead_notes"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can delete own company payments" ON "lead_payments";
DROP POLICY IF EXISTS "Users can delete own company payments" ON "lead_payments";
CREATE POLICY "Users can delete own company payments" ON "lead_payments"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert own company payments" ON "lead_payments";
DROP POLICY IF EXISTS "Users can insert own company payments" ON "lead_payments";
CREATE POLICY "Users can insert own company payments" ON "lead_payments"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can update own company payments" ON "lead_payments";
DROP POLICY IF EXISTS "Users can update own company payments" ON "lead_payments";
CREATE POLICY "Users can update own company payments" ON "lead_payments"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view own company payments" ON "lead_payments";
DROP POLICY IF EXISTS "Users can view own company payments" ON "lead_payments";
CREATE POLICY "Users can view own company payments" ON "lead_payments"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert their company's lead status logs" ON "lead_status_logs";
DROP POLICY IF EXISTS "Users can insert their company's lead status logs" ON "lead_status_logs";
CREATE POLICY "Users can insert their company's lead status logs" ON "lead_status_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company's lead status logs" ON "lead_status_logs";
DROP POLICY IF EXISTS "Users can view their company's lead status logs" ON "lead_status_logs";
CREATE POLICY "Users can view their company's lead status logs" ON "lead_status_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can delete statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can delete statuses" ON "lead_statuses";
CREATE POLICY "Admins can delete statuses" ON "lead_statuses"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can insert statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can insert statuses" ON "lead_statuses";
CREATE POLICY "Admins can insert statuses" ON "lead_statuses"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can update statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Admins can update statuses" ON "lead_statuses";
CREATE POLICY "Admins can update statuses" ON "lead_statuses"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view own company statuses" ON "lead_statuses";
DROP POLICY IF EXISTS "Users can view own company statuses" ON "lead_statuses";
CREATE POLICY "Users can view own company statuses" ON "lead_statuses"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can delete leads in their company" ON "leads";
DROP POLICY IF EXISTS "Admins can delete leads in their company" ON "leads";
CREATE POLICY "Admins can delete leads in their company" ON "leads"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Staff can manage leads" ON "leads";
DROP POLICY IF EXISTS "Staff can manage leads" ON "leads";
CREATE POLICY "Staff can manage leads" ON "leads"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can create leads for their company" ON "leads";
DROP POLICY IF EXISTS "Users can create leads for their company" ON "leads";
CREATE POLICY "Users can create leads for their company" ON "leads"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can update leads in their company" ON "leads";
DROP POLICY IF EXISTS "Users can update leads in their company" ON "leads";
CREATE POLICY "Users can update leads in their company" ON "leads"
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  )
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view leads in their company" ON "leads";
DROP POLICY IF EXISTS "Users can view leads in their company" ON "leads";
CREATE POLICY "Users can view leads in their company" ON "leads"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can delete their own read receipts" ON "notification_reads";
DROP POLICY IF EXISTS "Users can delete their own read receipts" ON "notification_reads";
CREATE POLICY "Users can delete their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid())))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert their own read receipts" ON "notification_reads";
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON "notification_reads";
CREATE POLICY "Users can insert their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid())))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their own read receipts" ON "notification_reads";
DROP POLICY IF EXISTS "Users can view their own read receipts" ON "notification_reads";
CREATE POLICY "Users can view their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid())))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "notification_sent_logs_select_own_company" ON "notification_sent_logs";
DROP POLICY IF EXISTS "notification_sent_logs_select_own_company" ON "notification_sent_logs";
CREATE POLICY "notification_sent_logs_select_own_company" ON "notification_sent_logs"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((subscription_id IN ( SELECT s.id
   FROM company_subscriptions s
  WHERE (s.company_id = ( SELECT u.company_id
           FROM users u
          WHERE (u.id = auth.uid()))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert their own company notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can insert their own company notifications" ON "notifications";
CREATE POLICY "Users can insert their own company notifications" ON "notifications"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can update their company notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can update their company notifications" ON "notifications";
CREATE POLICY "Users can update their company notifications" ON "notifications"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND ((user_id IS NULL) OR (user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company notifications" ON "notifications";
DROP POLICY IF EXISTS "Users can view their company notifications" ON "notifications";
CREATE POLICY "Users can view their company notifications" ON "notifications"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND ((user_id IS NULL) OR (user_id = auth.uid())) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can view own company audit logs" ON "payment_audit_logs";
DROP POLICY IF EXISTS "Admins can view own company audit logs" ON "payment_audit_logs";
CREATE POLICY "Admins can view own company audit logs" ON "payment_audit_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert own company audit logs" ON "payment_audit_logs";
DROP POLICY IF EXISTS "Users can insert own company audit logs" ON "payment_audit_logs";
CREATE POLICY "Users can insert own company audit logs" ON "payment_audit_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company payment notifications" ON "payment_notifications";
DROP POLICY IF EXISTS "Users can view their company payment notifications" ON "payment_notifications";
CREATE POLICY "Users can view their company payment notifications" ON "payment_notifications"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company payment transactions" ON "payment_transactions";
DROP POLICY IF EXISTS "Users can view their company payment transactions" ON "payment_transactions";
CREATE POLICY "Users can view their company payment transactions" ON "payment_transactions"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "payments_admin" ON "payments";
DROP POLICY IF EXISTS "payments_admin" ON "payments";
CREATE POLICY "payments_admin" ON "payments"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = payments.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "performance_goals_admin" ON "performance_goals";
DROP POLICY IF EXISTS "performance_goals_admin" ON "performance_goals";
CREATE POLICY "performance_goals_admin" ON "performance_goals"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = performance_goals.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Company members can delete their blacklist" ON "phone_blacklist";
DROP POLICY IF EXISTS "Company members can delete their blacklist" ON "phone_blacklist";
CREATE POLICY "Company members can delete their blacklist" ON "phone_blacklist"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))))
  );

DROP POLICY IF EXISTS "Company members can insert blacklist" ON "phone_blacklist";
DROP POLICY IF EXISTS "Company members can insert blacklist" ON "phone_blacklist";
CREATE POLICY "Company members can insert blacklist" ON "phone_blacklist"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))))
  );

DROP POLICY IF EXISTS "Company members can view their blacklist" ON "phone_blacklist";
DROP POLICY IF EXISTS "Company members can view their blacklist" ON "phone_blacklist";
CREATE POLICY "Company members can view their blacklist" ON "phone_blacklist"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))))
  );

DROP POLICY IF EXISTS "Admins can insert their company's privacy policies" ON "privacy_policies";
DROP POLICY IF EXISTS "Admins can insert their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Admins can insert their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = privacy_policies.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can update their company's privacy policies" ON "privacy_policies";
DROP POLICY IF EXISTS "Admins can update their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Admins can update their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = privacy_policies.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company's privacy policies" ON "privacy_policies";
DROP POLICY IF EXISTS "Users can view their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Users can view their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can insert their company's reservation date logs" ON "reservation_date_logs";
DROP POLICY IF EXISTS "Users can insert their company's reservation date logs" ON "reservation_date_logs";
CREATE POLICY "Users can insert their company's reservation date logs" ON "reservation_date_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company's reservation date logs" ON "reservation_date_logs";
DROP POLICY IF EXISTS "Users can view their company's reservation date logs" ON "reservation_date_logs";
CREATE POLICY "Users can view their company's reservation date logs" ON "reservation_date_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view reports in their company" ON "saved_reports";
DROP POLICY IF EXISTS "Users can view reports in their company" ON "saved_reports";
CREATE POLICY "Users can view reports in their company" ON "saved_reports"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can manage sheet sync configs" ON "sheet_sync_configs";
DROP POLICY IF EXISTS "Admins can manage sheet sync configs" ON "sheet_sync_configs";
CREATE POLICY "Admins can manage sheet sync configs" ON "sheet_sync_configs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_configs.company_id) AND (users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company's sheet sync configs" ON "sheet_sync_configs";
DROP POLICY IF EXISTS "Users can view their company's sheet sync configs" ON "sheet_sync_configs";
CREATE POLICY "Users can view their company's sheet sync configs" ON "sheet_sync_configs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_configs.company_id) AND (users.id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company's sheet sync logs" ON "sheet_sync_logs";
DROP POLICY IF EXISTS "Users can view their company's sheet sync logs" ON "sheet_sync_logs";
CREATE POLICY "Users can view their company's sheet sync logs" ON "sheet_sync_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_logs.company_id) AND (users.id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "subscription_plans_admin" ON "subscription_plans";
DROP POLICY IF EXISTS "subscription_plans_admin" ON "subscription_plans";
CREATE POLICY "subscription_plans_admin" ON "subscription_plans"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Authenticated users can create ticket messages" ON "support_ticket_messages";
DROP POLICY IF EXISTS "Authenticated users can create ticket messages" ON "support_ticket_messages";
CREATE POLICY "Authenticated users can create ticket messages" ON "support_ticket_messages"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((ticket_id IN ( SELECT support_tickets.id
   FROM support_tickets
  WHERE (support_tickets.company_id = ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Super admins can create replies" ON "support_ticket_replies";
DROP POLICY IF EXISTS "Super admins can create replies" ON "support_ticket_replies";
CREATE POLICY "Super admins can create replies" ON "support_ticket_replies"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "System can insert status history" ON "support_ticket_status_history";
DROP POLICY IF EXISTS "System can insert status history" ON "support_ticket_status_history";
CREATE POLICY "System can insert status history" ON "support_ticket_status_history"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can create tickets for their company" ON "support_tickets";
DROP POLICY IF EXISTS "Users can create tickets for their company" ON "support_tickets";
CREATE POLICY "Users can create tickets for their company" ON "support_tickets"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (created_by_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can update their company tickets" ON "support_tickets";
DROP POLICY IF EXISTS "Users can update their company tickets" ON "support_tickets";
CREATE POLICY "Users can update their company tickets" ON "support_tickets"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  )
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company tickets" ON "support_tickets";
DROP POLICY IF EXISTS "Users can view their company tickets" ON "support_tickets";
CREATE POLICY "Users can view their company tickets" ON "support_tickets"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "system_health_logs_admin" ON "system_health_logs";
DROP POLICY IF EXISTS "system_health_logs_admin" ON "system_health_logs";
CREATE POLICY "system_health_logs_admin" ON "system_health_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role]))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can insert their company tracking pixels" ON "tracking_pixels";
DROP POLICY IF EXISTS "Admins can insert their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Admins can insert their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = tracking_pixels.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Admins can update their company tracking pixels" ON "tracking_pixels";
DROP POLICY IF EXISTS "Admins can update their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Admins can update their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = tracking_pixels.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "Users can view their company tracking pixels" ON "tracking_pixels";
DROP POLICY IF EXISTS "Users can view their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Users can view their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

DROP POLICY IF EXISTS "usage_logs_admin" ON "usage_logs";
DROP POLICY IF EXISTS "usage_logs_admin" ON "usage_logs";
CREATE POLICY "usage_logs_admin" ON "usage_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = usage_logs.company_id)))) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_active = true) AND (users.company_id IN ( SELECT companies.id
   FROM companies
  WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL))))))))
  );

-- 74차 QA (High): users_select_same_company 정책은 users_select_own("id = auth.uid()",
-- 자기 행은 무조건 열람 가능 - middleware.ts:379-383의 셀프조회가 이 정책을 통해
-- 활성상태와 무관하게 계속 성공하므로 아래 조건 추가와 무관하게 탐지 로직은 안전함)
-- 과 별개로, 68차 전역패치 대상에서 빠져 팀원 비활성화/회사 정지와 무관하게 팀
-- 전체(이메일/전화/역할 포함)를 계속 열람할 수 있었다. caller 자신이 활성 사용자이면서
-- 활성 회사에 속해야 한다는 조건을 추가한다(대상 행이 아니라 caller 기준 - users_select_own이
-- 별도 정책으로 항상 자기 행은 허용하므로 자기조회 탐지 로직과 충돌 없음).
DROP POLICY IF EXISTS "users_select_same_company" ON "users";
DROP POLICY IF EXISTS "users_select_same_company" ON "users";
CREATE POLICY "users_select_same_company" ON "users"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (company_id = get_my_company_id())
    AND (EXISTS ( SELECT 1
       FROM users caller
      WHERE ((caller.id = auth.uid()) AND (caller.is_active = true) AND (caller.company_id IN ( SELECT companies.id
       FROM companies
      WHERE ((companies.is_active = true) AND (companies.withdrawn_at IS NULL)))))))
  );
