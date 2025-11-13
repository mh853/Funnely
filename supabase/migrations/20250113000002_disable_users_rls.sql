-- Emergency fix: Completely disable RLS on users table
-- This is a temporary solution to unblock development
-- You can re-enable with proper policies later

-- Drop all existing policies first
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- Disable RLS entirely on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Note: With RLS disabled, the application relies on server-side auth checks
-- All queries use the service role key which bypasses RLS
-- This is acceptable for development and single-tenant applications
