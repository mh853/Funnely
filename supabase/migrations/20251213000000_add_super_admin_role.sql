-- Add super admin role to users table
-- This enables system administrators to manage all companies

-- Add is_super_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Add index for performance (only indexes true values)
CREATE INDEX IF NOT EXISTS idx_users_super_admin
  ON users(is_super_admin)
  WHERE is_super_admin = true;

-- Add comment
COMMENT ON COLUMN users.is_super_admin IS 'Flag indicating if user has super admin privileges (can access /admin portal)';

-- Note: Initial super admin account should be created manually via SQL:
-- UPDATE users SET is_super_admin = true WHERE email = 'admin@funnely.com';
