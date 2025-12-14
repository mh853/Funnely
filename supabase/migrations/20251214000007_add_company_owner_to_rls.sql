-- FIX: Add 'company_owner' role to RLS policies
-- Current user has role 'company_owner' but policies only allow:
-- hospital_owner, hospital_admin, marketing_manager, marketing_staff

-- Drop all existing policies
DROP POLICY IF EXISTS "Staff can view landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Staff can update landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Staff can insert landing pages" ON landing_pages;
DROP POLICY IF EXISTS "Staff can delete landing pages" ON landing_pages;

-- Create SELECT policy with company_owner included
CREATE POLICY "Staff can view landing pages"
  ON landing_pages FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
    )
  );

-- Create UPDATE policy with company_owner included
CREATE POLICY "Staff can update landing pages"
  ON landing_pages FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
    )
  );

-- Create INSERT policy with company_owner included
CREATE POLICY "Staff can insert landing pages"
  ON landing_pages FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
    )
  );

-- Create DELETE policy with company_owner included
CREATE POLICY "Staff can delete landing pages"
  ON landing_pages FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_owner', 'hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff')
    )
  );

-- Add comments
COMMENT ON POLICY "Staff can view landing pages" ON landing_pages IS
'Allows company owners and staff to view landing pages in their company';

COMMENT ON POLICY "Staff can update landing pages" ON landing_pages IS
'Allows company owners and staff to update landing pages in their company';

COMMENT ON POLICY "Staff can insert landing pages" ON landing_pages IS
'Allows company owners and staff to create new landing pages in their company';

COMMENT ON POLICY "Staff can delete landing pages" ON landing_pages IS
'Allows company owners and staff to delete landing pages in their company';
