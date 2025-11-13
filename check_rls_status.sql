-- Check if RLS is enabled on users table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- Check all policies on users table (different query for pg_policies)
SELECT
  polname as policy_name,
  polcmd as command,
  polpermissive as permissive,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as check_expression
FROM pg_policy
JOIN pg_class ON pg_policy.polrelid = pg_class.oid
WHERE pg_class.relname = 'users';
