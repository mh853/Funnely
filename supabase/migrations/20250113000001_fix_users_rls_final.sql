-- Complete RLS policy reset for users table
-- This completely removes all policies and recreates them without any recursion

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view users in their hospital" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view hospital members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simplified, non-recursive policies

-- Policy 1: Users can view their own profile (no recursion, direct auth check)
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Note: Removed the "view hospital members" policy for now
-- This was causing the recursion issue
-- If you need this functionality, it should be implemented differently
-- (e.g., through a database function or by storing hospital_id in JWT claims)
