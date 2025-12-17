-- Add email template permissions to existing roles
-- Phase 4.4: Email Template System - Permission Assignment

-- Update super_admin role to include email template permissions
UPDATE admin_roles
SET permissions = permissions ||
  jsonb_build_array('view_email_templates', 'manage_email_templates')
WHERE code = 'super_admin'
AND NOT (
  permissions @> '"view_email_templates"'::jsonb OR
  permissions @> '"manage_email_templates"'::jsonb
);

-- Update cs_manager role to include view permission
UPDATE admin_roles
SET permissions = permissions || '"view_email_templates"'::jsonb
WHERE code = 'cs_manager'
AND NOT (permissions @> '"view_email_templates"'::jsonb);

-- Update finance role to include view permission
UPDATE admin_roles
SET permissions = permissions || '"view_email_templates"'::jsonb
WHERE code = 'finance'
AND NOT (permissions @> '"view_email_templates"'::jsonb);
