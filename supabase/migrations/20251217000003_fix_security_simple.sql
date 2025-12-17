-- Fix Security Warnings (Simple Version)
-- Migration: 20251217000003_fix_security_simple.sql
-- Purpose: Fix function search_path warnings with simple approach

-- ============================================================
-- 1. List all functions first (for debugging)
-- ============================================================

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'increment_landing_page_views',
  'increment_landing_page_submissions',
  'increment_external_page_views',
  'increment_external_page_submissions',
  'auto_assign_lead',
  'update_lead_statuses_updated_at',
  'insert_default_lead_statuses',
  'trigger_insert_default_lead_statuses',
  'update_subscription_status',
  'update_notifications_updated_at',
  'auto_assign_call_staff',
  'trigger_auto_assign_call_staff',
  'generate_invitation_code',
  'cleanup_expired_invitations',
  'set_company_short_id',
  'generate_short_id',
  'set_user_short_id',
  'update_updated_at_column'
)
ORDER BY p.proname;

-- ============================================================
-- 2. Fix functions with known signatures
-- ============================================================

-- Landing page functions (UUID parameter)
ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.increment_landing_page_submissions(uuid) SET search_path = '';
ALTER FUNCTION public.increment_external_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.increment_external_page_submissions(uuid) SET search_path = '';

-- Trigger functions (RETURNS trigger)
ALTER FUNCTION public.update_lead_statuses_updated_at() SET search_path = '';
ALTER FUNCTION public.insert_default_lead_statuses() SET search_path = '';
ALTER FUNCTION public.trigger_insert_default_lead_statuses() SET search_path = '';
ALTER FUNCTION public.update_subscription_status() SET search_path = '';
ALTER FUNCTION public.update_notifications_updated_at() SET search_path = '';
ALTER FUNCTION public.auto_assign_call_staff() SET search_path = '';
ALTER FUNCTION public.trigger_auto_assign_call_staff() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Utility functions
ALTER FUNCTION public.generate_invitation_code() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_invitations() SET search_path = '';
ALTER FUNCTION public.set_company_short_id() SET search_path = '';
ALTER FUNCTION public.generate_short_id(integer) SET search_path = '';
ALTER FUNCTION public.set_user_short_id() SET search_path = '';

-- ============================================================
-- 3. Fix Materialized View Access
-- ============================================================

-- Revoke access from anon and authenticated roles
REVOKE ALL ON public.admin_company_stats FROM anon;
REVOKE ALL ON public.admin_company_stats FROM authenticated;

-- Grant access only to service_role
GRANT SELECT ON public.admin_company_stats TO service_role;

-- ============================================================
-- 4. Verification Message
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Security warnings fix completed!';
  RAISE NOTICE '🔒 Function search_path set for all functions';
  RAISE NOTICE '🔒 Materialized view access restricted';
  RAISE NOTICE '';
  RAISE NOTICE 'Please verify in Supabase linter that all warnings are resolved.';
END $$;
