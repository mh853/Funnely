-- Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

-- Create index for department autocomplete queries
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE department IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.department IS 'User department name for organization structure';

-- Add department column to company_invitations table for pre-assigning department during invite
ALTER TABLE company_invitations ADD COLUMN IF NOT EXISTS department TEXT;

-- Add comment for documentation
COMMENT ON COLUMN company_invitations.department IS 'Pre-assigned department for invited user';
