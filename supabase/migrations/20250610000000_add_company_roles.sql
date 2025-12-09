-- ============================================================================
-- Add Company Roles to user_role enum
-- Created: 2025-06-10
-- Description: Add company_owner and company_admin roles for rebrand from hospital to company
-- Note: Keeping hospital_owner and hospital_admin for backward compatibility
-- ============================================================================

-- Add new role values to user_role enum
-- PostgreSQL requires adding values one by one
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company_owner';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company_admin';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Update existing migration references in comments
-- ============================================================================

-- Update comment on users.role column
COMMENT ON COLUMN users.role IS 'User role: company_owner, company_admin, marketing_manager, marketing_staff, viewer (legacy: hospital_owner, hospital_admin)';

-- Update comment on users.simple_role column if exists
DO $$ BEGIN
  COMMENT ON COLUMN users.simple_role IS 'Simplified 3-tier role: admin (company_owner/company_admin), manager (marketing_manager), user (marketing_staff/viewer)';
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- ============================================================================
-- Update the role mapping in user_management_system migration
-- This updates how simple_role maps from the legacy role values
-- ============================================================================

-- Update existing hospital_owner to company_owner (optional - for gradual migration)
-- Uncomment if you want to migrate existing data:
-- UPDATE users SET role = 'company_owner' WHERE role = 'hospital_owner';
-- UPDATE users SET role = 'company_admin' WHERE role = 'hospital_admin';

-- ============================================================================
-- Note: The simple_role mapping already handles admin for both company_ and hospital_ prefixed roles
-- See: 20250208000000_user_management_system.sql
-- The application code has been updated to accept both old and new role names
-- ============================================================================
