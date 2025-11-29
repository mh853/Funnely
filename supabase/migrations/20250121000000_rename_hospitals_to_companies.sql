-- Migration: Rename hospitals to companies
-- This migration renames the hospitals table to companies
-- and updates all foreign key references

-- 1. Rename table
ALTER TABLE hospitals RENAME TO companies;

-- 2. Rename indexes
ALTER INDEX idx_hospitals_business_number RENAME TO idx_companies_business_number;

-- 3. Update comments
COMMENT ON TABLE companies IS '회사(고객사) 조직 정보';

-- 4. Rename column in users table
ALTER TABLE users RENAME COLUMN hospital_id TO company_id;

-- 5. Update index on users table
DROP INDEX IF EXISTS idx_users_hospital_id;
CREATE INDEX idx_users_company_id ON users(company_id);

-- 6. Rename column in ad_accounts table
ALTER TABLE ad_accounts RENAME COLUMN hospital_id TO company_id;

-- 7. Update index on ad_accounts table
DROP INDEX IF EXISTS idx_ad_accounts_hospital_id;
CREATE INDEX idx_ad_accounts_company_id ON ad_accounts(company_id);

-- 8. Rename column in audit_logs table
ALTER TABLE audit_logs RENAME COLUMN hospital_id TO company_id;

-- 9. Update index on audit_logs table
DROP INDEX IF EXISTS idx_audit_logs_hospital_id;
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);

-- 10. Rename column in saved_reports table
ALTER TABLE saved_reports RENAME COLUMN hospital_id TO company_id;

-- 11. Update index on saved_reports table
DROP INDEX IF EXISTS idx_saved_reports_hospital_id;
CREATE INDEX idx_saved_reports_company_id ON saved_reports(company_id);

-- 12. Rename column in landing_pages table
ALTER TABLE landing_pages RENAME COLUMN hospital_id TO company_id;

-- 13. Update index on landing_pages table
DROP INDEX IF EXISTS idx_landing_pages_hospital_id;
CREATE INDEX idx_landing_pages_company_id ON landing_pages(company_id);

-- 14. Rename column in form_templates table
ALTER TABLE form_templates RENAME COLUMN hospital_id TO company_id;

-- 15. Update index on form_templates table
DROP INDEX IF EXISTS idx_form_templates_hospital_id;
CREATE INDEX idx_form_templates_company_id ON form_templates(company_id);

-- 16. Rename column in leads table
ALTER TABLE leads RENAME COLUMN hospital_id TO company_id;

-- 17. Update index on leads table
DROP INDEX IF EXISTS idx_leads_hospital_id;
CREATE INDEX idx_leads_company_id ON leads(company_id);

-- 18. Rename column in campaigns table (if it has hospital_id)
-- Note: campaigns references ad_accounts, not hospitals directly
-- But we'll update any direct references if they exist

-- 19. Update RLS policies
-- Drop old policies and recreate with new table name

-- COMPANIES POLICIES (formerly hospitals)
DROP POLICY IF EXISTS "Users can view their own hospital" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hospital owners can update their hospital" ON companies;
CREATE POLICY "Company owners can update their company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid() AND role = 'hospital_owner'
    )
  );

-- USERS POLICIES
DROP POLICY IF EXISTS "Users can view users in their hospital" ON users;
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );

-- AD ACCOUNTS POLICIES
DROP POLICY IF EXISTS "Users can view ad accounts in their hospital" ON ad_accounts;
CREATE POLICY "Users can view ad accounts in their company"
  ON ad_accounts FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can manage ad accounts" ON ad_accounts;
CREATE POLICY "Managers can manage ad accounts"
  ON ad_accounts FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- CAMPAIGNS POLICIES
DROP POLICY IF EXISTS "Users can view campaigns in their hospital" ON campaigns;
CREATE POLICY "Users can view campaigns in their company"
  ON campaigns FOR SELECT
  USING (
    ad_account_id IN (
      SELECT id FROM ad_accounts
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- CAMPAIGN METRICS POLICIES
DROP POLICY IF EXISTS "Users can view metrics in their hospital" ON campaign_metrics;
CREATE POLICY "Users can view metrics in their company"
  ON campaign_metrics FOR SELECT
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN ad_accounts aa ON c.ad_account_id = aa.id
      WHERE aa.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin')
    )
  );

-- SAVED REPORTS POLICIES
DROP POLICY IF EXISTS "Users can view reports in their hospital" ON saved_reports;
CREATE POLICY "Users can view reports in their company"
  ON saved_reports FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- LANDING PAGES POLICIES
DROP POLICY IF EXISTS "Users can view landing pages in their hospital" ON landing_pages;
CREATE POLICY "Users can view landing pages in their company"
  ON landing_pages FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can manage landing pages" ON landing_pages;
CREATE POLICY "Managers can manage landing pages"
  ON landing_pages FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- FORM TEMPLATES POLICIES
DROP POLICY IF EXISTS "Users can view form templates in their hospital" ON form_templates;
CREATE POLICY "Users can view form templates in their company"
  ON form_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can manage form templates" ON form_templates;
CREATE POLICY "Managers can manage form templates"
  ON form_templates FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager')
    )
  );

-- LEADS POLICIES
DROP POLICY IF EXISTS "Users can view leads in their hospital" ON leads;
CREATE POLICY "Users can view leads in their company"
  ON leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can manage leads" ON leads;
CREATE POLICY "Staff can manage leads"
  ON leads FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
    )
  );
