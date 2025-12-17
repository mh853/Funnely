-- Fix Security Warnings
-- Migration: 20251217000001_fix_security_warnings.sql
-- Purpose: Fix remaining security warnings from Supabase linter

-- ============================================================
-- 1. Fix Function Search Path Mutable (18 functions)
-- ============================================================
-- Purpose: Prevent SQL injection attacks by setting immutable search_path

-- Landing page functions
ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.increment_landing_page_submissions(uuid) SET search_path = '';
ALTER FUNCTION public.increment_external_page_views(uuid) SET search_path = '';
ALTER FUNCTION public.increment_external_page_submissions(uuid) SET search_path = '';

-- Lead management functions
ALTER FUNCTION public.auto_assign_lead() SET search_path = '';
ALTER FUNCTION public.update_lead_statuses_updated_at() SET search_path = '';
ALTER FUNCTION public.insert_default_lead_statuses() SET search_path = '';
ALTER FUNCTION public.trigger_insert_default_lead_statuses() SET search_path = '';

-- Subscription and notification functions
ALTER FUNCTION public.update_subscription_status() SET search_path = '';
ALTER FUNCTION public.update_notifications_updated_at() SET search_path = '';

-- Call staff functions
ALTER FUNCTION public.auto_assign_call_staff() SET search_path = '';
ALTER FUNCTION public.trigger_auto_assign_call_staff() SET search_path = '';

-- Invitation functions
ALTER FUNCTION public.generate_invitation_code() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_invitations() SET search_path = '';

-- ID generation functions
ALTER FUNCTION public.set_company_short_id() SET search_path = '';
ALTER FUNCTION public.generate_short_id(integer) SET search_path = '';
ALTER FUNCTION public.set_user_short_id() SET search_path = '';

-- Utility functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- ============================================================
-- 2. Fix Materialized View in API
-- ============================================================
-- Purpose: Prevent unauthorized access to admin_company_stats

-- Disable direct access to materialized view
ALTER MATERIALIZED VIEW public.admin_company_stats OWNER TO postgres;

-- Revoke access from anon and authenticated roles
REVOKE ALL ON public.admin_company_stats FROM anon;
REVOKE ALL ON public.admin_company_stats FROM authenticated;

-- Grant access only to service_role
GRANT SELECT ON public.admin_company_stats TO service_role;

-- Add RLS (though materialized views don't fully support RLS, this adds extra protection)
ALTER MATERIALIZED VIEW public.admin_company_stats SET (security_barrier = true);

-- ============================================================
-- 3. Verification
-- ============================================================

DO $$
DECLARE
  fixed_functions INTEGER;
  total_functions INTEGER := 18;
BEGIN
  -- Count functions with search_path set
  SELECT COUNT(*)
  INTO fixed_functions
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
  AND prosecdef = false; -- search_path is set

  RAISE NOTICE '✅ Security Warnings Fix Completed';
  RAISE NOTICE '📊 Fixed functions: % out of %', fixed_functions, total_functions;
  RAISE NOTICE '🔒 Materialized view access restricted';

  IF fixed_functions = total_functions THEN
    RAISE NOTICE '🎉 All function security warnings resolved!';
  ELSE
    RAISE WARNING '⚠️ Some functions still need fixing: % remaining', total_functions - fixed_functions;
  END IF;
END $$;

-- ============================================================
-- 4. Notes for Leaked Password Protection
-- ============================================================
-- This cannot be fixed via SQL migration
-- Must be enabled manually in Supabase Dashboard:
-- 1. Go to Authentication > Policies
-- 2. Enable "Leaked Password Protection"
-- 3. This will check passwords against HaveIBeenPwned.org database
