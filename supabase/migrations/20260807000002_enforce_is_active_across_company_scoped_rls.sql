-- 68차 QA(R68-3): 회사 스코프 RLS 정책 86개(45개 테이블)가 전부 팀원 is_active 상태를
-- 확인하지 않는 스키마 전역 패턴이었다. company_id IN (SELECT company_id FROM users
-- WHERE id = auth.uid()) 형태의 서브쿼리가 activation 여부와 무관하게 항상 caller의
-- company_id를 반환하므로, 관리자가 팀원을 비활성화(is_active=false)해도 그 팀원의
-- 기존 세션이 만료되기 전까지는 (미들웨어를 거치지 않는 브라우저->Supabase 직접 호출
-- 경로를 통해) leads/notifications/landing_pages/payments 등 사실상 전 영역 데이터에
-- 계속 접근·수정할 수 있었다(68차 QA 확인). 미들웨어(middleware.ts)는 /dashboard,
-- /api 요청에서는 is_active를 정상 확인하지만, 클라이언트 컴포넌트가 브라우저에서
-- 직접 만드는 Supabase 세션 클라이언트 호출은 미들웨어를 거치지 않아 RLS만이 유일한
-- 방어선인데 RLS 자체에 이 확인이 없었다.
--
-- 아래는 영향받는 86개 정책 전부에 대해 기존 USING/WITH CHECK 조건은 단 한 글자도
-- 건드리지 않고, 'caller 본인이 is_active=true인 활성 사용자여야 한다'는 조건 하나만
-- AND로 추가한다(DROP POLICY + CREATE POLICY로 동일한 이름·FOR·TO 절 재생성, USING/
-- WITH CHECK 원문은 pg_policies에서 그대로 가져와 괄호로 감싸고 뒤에 AND(활성확인)만
-- 덧붙임 - 원본 서브쿼리 내부를 직접 수정하지 않아 기존 role/조건 로직을 그대로 보존).

DROP POLICY "Managers can manage ad accounts" ON "ad_accounts";
CREATE POLICY "Managers can manage ad accounts" ON "ad_accounts"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view ad accounts in their company" ON "ad_accounts";
CREATE POLICY "Users can view ad accounts in their company" ON "ad_accounts"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Company owners can delete credentials" ON "api_credentials";
CREATE POLICY "Company owners can delete credentials" ON "api_credentials"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Company owners and admins can insert credentials" ON "api_credentials";
CREATE POLICY "Company owners and admins can insert credentials" ON "api_credentials"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view own company credentials" ON "api_credentials";
CREATE POLICY "Users can view own company credentials" ON "api_credentials"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Company owners and admins can update credentials" ON "api_credentials";
CREATE POLICY "Company owners and admins can update credentials" ON "api_credentials"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "api_usage_logs_admin" ON "api_usage_logs";
CREATE POLICY "api_usage_logs_admin" ON "api_usage_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = api_usage_logs.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "bulk_operation_logs_select_own_company" ON "bulk_operation_logs";
CREATE POLICY "bulk_operation_logs_select_own_company" ON "bulk_operation_logs"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((executed_by IN ( SELECT u2.id
   FROM users u2
  WHERE (u2.company_id = ( SELECT u1.company_id
           FROM users u1
          WHERE (u1.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can manage their events" ON "calendar_events";
CREATE POLICY "Users can manage their events" ON "calendar_events"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their assigned events" ON "calendar_events";
CREATE POLICY "Users can view their assigned events" ON "calendar_events"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (((auth.uid() = ANY (assigned_to)) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = calendar_events.hospital_id) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view metrics in their company" ON "campaign_metrics";
CREATE POLICY "Users can view metrics in their company" ON "campaign_metrics"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((campaign_id IN ( SELECT c.id
   FROM (campaigns c
     JOIN ad_accounts aa ON ((c.ad_account_id = aa.id)))
  WHERE (aa.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can manage campaigns" ON "campaigns";
CREATE POLICY "Staff can manage campaigns" ON "campaigns"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((ad_account_id IN ( SELECT ad_accounts.id
   FROM ad_accounts
  WHERE (ad_accounts.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view campaigns in their company" ON "campaigns";
CREATE POLICY "Users can view campaigns in their company" ON "campaigns"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((ad_account_id IN ( SELECT ad_accounts.id
   FROM ad_accounts
  WHERE (ad_accounts.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their own company" ON "companies";
CREATE POLICY "Users can view their own company" ON "companies"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Company admins can update their company" ON "companies";
CREATE POLICY "Company admins can update their company" ON "companies"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "System can insert activity logs" ON "company_activity_logs";
CREATE POLICY "System can insert activity logs" ON "company_activity_logs"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "company_members_manage_custom_domains" ON "company_custom_domains";
CREATE POLICY "company_members_manage_custom_domains" ON "company_custom_domains"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can view company invitations" ON "company_invitations";
CREATE POLICY "Admins can view company invitations" ON "company_invitations"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (((company_id = get_my_company_id()) AND (am_i_admin_or_legacy_owner() OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'manager'::simple_user_role)))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "company_subscriptions_admin" ON "company_subscriptions";
CREATE POLICY "company_subscriptions_admin" ON "company_subscriptions"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = 'admin'::simple_user_role) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role]))) AND (users.company_id = company_subscriptions.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "company_subscriptions_select_members" ON "company_subscriptions";
CREATE POLICY "company_subscriptions_select_members" ON "company_subscriptions"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "error_logs_admin" ON "error_logs";
CREATE POLICY "error_logs_admin" ON "error_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = error_logs.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Marketing staff can manage external collection pages" ON "external_collection_pages";
CREATE POLICY "Marketing staff can manage external collection pages" ON "external_collection_pages"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view external collection pages in their company" ON "external_collection_pages";
CREATE POLICY "Users can view external collection pages in their company" ON "external_collection_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Managers can manage form templates" ON "form_templates";
CREATE POLICY "Managers can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Marketing staff can manage form templates" ON "form_templates";
CREATE POLICY "Marketing staff can manage form templates" ON "form_templates"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id AS hospital_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view form templates in their company" ON "form_templates";
CREATE POLICY "Users can view form templates in their company" ON "form_templates"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "generated_reports_admin" ON "generated_reports";
CREATE POLICY "generated_reports_admin" ON "generated_reports"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = generated_reports.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "invoices_admin" ON "invoices";
CREATE POLICY "invoices_admin" ON "invoices"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = invoices.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Marketing staff can view analytics" ON "landing_page_analytics";
CREATE POLICY "Marketing staff can view analytics" ON "landing_page_analytics"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((landing_page_id IN ( SELECT landing_pages.id
   FROM landing_pages
  WHERE (landing_pages.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can delete landing pages" ON "landing_pages";
CREATE POLICY "Staff can delete landing pages" ON "landing_pages"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can insert landing pages" ON "landing_pages";
CREATE POLICY "Staff can insert landing pages" ON "landing_pages"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can view landing pages" ON "landing_pages";
CREATE POLICY "Staff can view landing pages" ON "landing_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view landing pages in their company" ON "landing_pages";
CREATE POLICY "Users can view landing pages in their company" ON "landing_pages"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can update landing pages" ON "landing_pages";
CREATE POLICY "Staff can update landing pages" ON "landing_pages"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can delete notes for leads in their company" ON "lead_notes";
CREATE POLICY "Users can delete notes for leads in their company" ON "lead_notes"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can create notes for their leads" ON "lead_notes";
CREATE POLICY "Users can create notes for their leads" ON "lead_notes"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    (((user_id = auth.uid()) AND (lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid())))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view notes for leads in their hospital" ON "lead_notes";
CREATE POLICY "Users can view notes for leads in their hospital" ON "lead_notes"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((lead_id IN ( SELECT leads.id
   FROM leads
  WHERE (leads.company_id IN ( SELECT users.company_id AS hospital_id
           FROM users
          WHERE (users.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can delete own company payments" ON "lead_payments";
CREATE POLICY "Users can delete own company payments" ON "lead_payments"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert own company payments" ON "lead_payments";
CREATE POLICY "Users can insert own company payments" ON "lead_payments"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view own company payments" ON "lead_payments";
CREATE POLICY "Users can view own company payments" ON "lead_payments"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can update own company payments" ON "lead_payments";
CREATE POLICY "Users can update own company payments" ON "lead_payments"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert their company's lead status logs" ON "lead_status_logs";
CREATE POLICY "Users can insert their company's lead status logs" ON "lead_status_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company's lead status logs" ON "lead_status_logs";
CREATE POLICY "Users can view their company's lead status logs" ON "lead_status_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can delete statuses" ON "lead_statuses";
CREATE POLICY "Admins can delete statuses" ON "lead_statuses"
  AS PERMISSIVE FOR DELETE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can insert statuses" ON "lead_statuses";
CREATE POLICY "Admins can insert statuses" ON "lead_statuses"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view own company statuses" ON "lead_statuses";
CREATE POLICY "Users can view own company statuses" ON "lead_statuses"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can update statuses" ON "lead_statuses";
CREATE POLICY "Admins can update statuses" ON "lead_statuses"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Staff can manage leads" ON "leads";
CREATE POLICY "Staff can manage leads" ON "leads"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['hospital_owner'::user_role, 'hospital_admin'::user_role, 'marketing_manager'::user_role, 'marketing_staff'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can delete leads in their company" ON "leads";
CREATE POLICY "Admins can delete leads in their company" ON "leads"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can create leads for their company" ON "leads";
CREATE POLICY "Users can create leads for their company" ON "leads"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view leads in their company" ON "leads";
CREATE POLICY "Users can view leads in their company" ON "leads"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can update leads in their company" ON "leads";
CREATE POLICY "Users can update leads in their company" ON "leads"
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  )
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can delete their own read receipts" ON "notification_reads";
CREATE POLICY "Users can delete their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert their own read receipts" ON "notification_reads";
CREATE POLICY "Users can insert their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their own read receipts" ON "notification_reads";
CREATE POLICY "Users can view their own read receipts" ON "notification_reads"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM notifications
  WHERE ((notifications.id = notification_reads.notification_id) AND (notifications.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "notification_sent_logs_select_own_company" ON "notification_sent_logs";
CREATE POLICY "notification_sent_logs_select_own_company" ON "notification_sent_logs"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((subscription_id IN ( SELECT s.id
   FROM company_subscriptions s
  WHERE (s.company_id = ( SELECT u.company_id
           FROM users u
          WHERE (u.id = auth.uid()))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert their own company notifications" ON "notifications";
CREATE POLICY "Users can insert their own company notifications" ON "notifications"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company notifications" ON "notifications";
CREATE POLICY "Users can view their company notifications" ON "notifications"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND ((user_id IS NULL) OR (user_id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can update their company notifications" ON "notifications";
CREATE POLICY "Users can update their company notifications" ON "notifications"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    (((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND ((user_id IS NULL) OR (user_id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert own company audit logs" ON "payment_audit_logs";
CREATE POLICY "Users can insert own company audit logs" ON "payment_audit_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can view own company audit logs" ON "payment_audit_logs";
CREATE POLICY "Admins can view own company audit logs" ON "payment_audit_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.id = auth.uid()) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company payment notifications" ON "payment_notifications";
CREATE POLICY "Users can view their company payment notifications" ON "payment_notifications"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company payment transactions" ON "payment_transactions";
CREATE POLICY "Users can view their company payment transactions" ON "payment_transactions"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "payments_admin" ON "payments";
CREATE POLICY "payments_admin" ON "payments"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = payments.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "performance_goals_admin" ON "performance_goals";
CREATE POLICY "performance_goals_admin" ON "performance_goals"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = performance_goals.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can insert their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Admins can insert their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = privacy_policies.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Users can view their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can update their company's privacy policies" ON "privacy_policies";
CREATE POLICY "Admins can update their company's privacy policies" ON "privacy_policies"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = privacy_policies.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can insert their company's reservation date logs" ON "reservation_date_logs";
CREATE POLICY "Users can insert their company's reservation date logs" ON "reservation_date_logs"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company's reservation date logs" ON "reservation_date_logs";
CREATE POLICY "Users can view their company's reservation date logs" ON "reservation_date_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view reports in their company" ON "saved_reports";
CREATE POLICY "Users can view reports in their company" ON "saved_reports"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can manage sheet sync configs" ON "sheet_sync_configs";
CREATE POLICY "Admins can manage sheet sync configs" ON "sheet_sync_configs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_configs.company_id) AND (users.id = auth.uid()) AND (users.simple_role = 'admin'::simple_user_role)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company's sheet sync configs" ON "sheet_sync_configs";
CREATE POLICY "Users can view their company's sheet sync configs" ON "sheet_sync_configs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_configs.company_id) AND (users.id = auth.uid())))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company's sheet sync logs" ON "sheet_sync_logs";
CREATE POLICY "Users can view their company's sheet sync logs" ON "sheet_sync_logs"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.company_id = sheet_sync_logs.company_id) AND (users.id = auth.uid())))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "subscription_plans_admin" ON "subscription_plans";
CREATE POLICY "subscription_plans_admin" ON "subscription_plans"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Authenticated users can create ticket messages" ON "support_ticket_messages";
CREATE POLICY "Authenticated users can create ticket messages" ON "support_ticket_messages"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    (((ticket_id IN ( SELECT support_tickets.id
   FROM support_tickets
  WHERE (support_tickets.company_id = ( SELECT users.company_id
           FROM users
          WHERE (users.id = auth.uid()))))) AND (user_id = auth.uid())))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Super admins can create replies" ON "support_ticket_replies";
CREATE POLICY "Super admins can create replies" ON "support_ticket_replies"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "System can insert status history" ON "support_ticket_status_history";
CREATE POLICY "System can insert status history" ON "support_ticket_status_history"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_super_admin = true)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can create tickets for their company" ON "support_tickets";
CREATE POLICY "Users can create tickets for their company" ON "support_tickets"
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    (((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))) AND (created_by_user_id = auth.uid())))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company tickets" ON "support_tickets";
CREATE POLICY "Users can view their company tickets" ON "support_tickets"
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can update their company tickets" ON "support_tickets";
CREATE POLICY "Users can update their company tickets" ON "support_tickets"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  )
  WITH CHECK (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "system_health_logs_admin" ON "system_health_logs";
CREATE POLICY "system_health_logs_admin" ON "system_health_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role]))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can insert their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Admins can insert their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR INSERT
  TO public
  WITH CHECK (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = tracking_pixels.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Users can view their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Users can view their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = auth.uid()))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "Admins can update their company tracking pixels" ON "tracking_pixels";
CREATE POLICY "Admins can update their company tracking pixels" ON "tracking_pixels"
  AS PERMISSIVE FOR UPDATE
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.company_id = tracking_pixels.company_id) AND ((users.simple_role = ANY (ARRAY['admin'::simple_user_role, 'manager'::simple_user_role])) OR (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role, 'hospital_owner'::user_role, 'hospital_admin'::user_role])))))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );

DROP POLICY "usage_logs_admin" ON "usage_logs";
CREATE POLICY "usage_logs_admin" ON "usage_logs"
  AS PERMISSIVE FOR ALL
  TO public
  USING (
    ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['company_owner'::user_role, 'company_admin'::user_role])) AND (users.company_id = usage_logs.company_id)))))
    AND (EXISTS ( SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_active = true ))
  );
