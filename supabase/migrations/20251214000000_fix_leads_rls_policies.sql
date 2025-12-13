-- Fix leads table RLS policies
-- Problem: Only SELECT policy exists, causing UPDATE operations to fail with PGRST116 error
-- Solution: Add UPDATE and INSERT policies for company members

-- Drop existing SELECT policy and recreate with company_id (hospital_id -> company_id migration)
DROP POLICY IF EXISTS "Users can view leads in their hospital" ON leads;
DROP POLICY IF EXISTS "Users can view leads in their company" ON leads;
DROP POLICY IF EXISTS "Super admins can view all leads" ON leads;

-- SELECT policy: Users can view leads in their company
CREATE POLICY "Users can view leads in their company"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- SELECT policy: Super admins can view all leads
CREATE POLICY "Super admins can view all leads"
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

-- INSERT policy: Users can create leads for their company
DROP POLICY IF EXISTS "Users can create leads for their company" ON leads;
CREATE POLICY "Users can create leads for their company"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- UPDATE policy: Users can update leads in their company
DROP POLICY IF EXISTS "Users can update leads in their company" ON leads;
CREATE POLICY "Users can update leads in their company"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- DELETE policy: Admin users can delete leads in their company
DROP POLICY IF EXISTS "Admins can delete leads in their company" ON leads;
CREATE POLICY "Admins can delete leads in their company"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND simple_role = 'admin'
    )
  );
