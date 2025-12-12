-- Grant super admin privileges to a user
-- IMPORTANT: Replace 'your-email@example.com' with your actual email address
-- Run this query in Supabase Dashboard SQL Editor

-- Option 1: Grant by email
UPDATE users
SET is_super_admin = true
WHERE email = 'your-email@example.com';

-- Option 2: Grant by user ID (if you know the UUID)
-- UPDATE users
-- SET is_super_admin = true
-- WHERE id = 'user-uuid-here';

-- Verify the update
SELECT id, email, full_name, is_super_admin
FROM users
WHERE is_super_admin = true;
