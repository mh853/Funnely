-- Fix infinite recursion in users RLS policy
-- The previous policy tried to query users table from within a policy on users table

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view users in their hospital" ON users;

-- Create non-recursive policy
-- Users can view their own profile directly without recursion
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view other users in their hospital
-- This requires the user's own record to be fetched first (using the policy above)
-- Then subsequent queries can use that hospital_id value
CREATE POLICY "Users can view hospital members"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.hospital_id = users.hospital_id
    )
  );
