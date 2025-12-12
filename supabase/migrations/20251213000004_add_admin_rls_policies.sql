-- Additional RLS policies for admin access to existing tables
-- Allows super admins to view all company data

-- Companies table: Super admins can view all companies
CREATE POLICY IF NOT EXISTS "Super admins can view all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Users table: Super admins can view all users
CREATE POLICY IF NOT EXISTS "Super admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.is_super_admin = true
    )
  );

-- Leads table: Super admins can view all leads
CREATE POLICY IF NOT EXISTS "Super admins can view all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Landing pages table: Super admins can view all landing pages
CREATE POLICY IF NOT EXISTS "Super admins can view all landing pages"
  ON landing_pages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Note: These policies allow super admins read-only access to all data
-- Write access for super admins should be implemented via dedicated API endpoints
-- with proper audit logging
