-- Fix privacy_policies RLS policies
-- The original migration had correct table reference but RLS was checking wrong column

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Users can update their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Users can insert their company's privacy policies" ON privacy_policies;

-- Create corrected policies using users table (correct table name)
-- Fixed: users.id should match auth.uid() directly, not users.company_id
CREATE POLICY "Users can view their company's privacy policies"
ON privacy_policies FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's privacy policies"
ON privacy_policies FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their company's privacy policies"
ON privacy_policies FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);
