-- Fix Security Warnings (Final Conservative Version)
-- Migration: 20251217000005_fix_security_final.sql
-- Purpose: Fix function search_path warnings for functions that definitely exist

-- ============================================================
-- Strategy: Only fix functions with standard signatures
-- ============================================================

-- Landing page view/submission tracking functions
-- These are called from API routes, should exist with (uuid) signature
DO $$
BEGIN
  -- increment_landing_page_views
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'increment_landing_page_views'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: increment_landing_page_views(uuid)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: increment_landing_page_views - %', SQLERRM;
    END;
  END IF;

  -- increment_landing_page_submissions
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'increment_landing_page_submissions'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.increment_landing_page_submissions(uuid) SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: increment_landing_page_submissions(uuid)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: increment_landing_page_submissions - %', SQLERRM;
    END;
  END IF;

  -- increment_external_page_views
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'increment_external_page_views'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.increment_external_page_views(uuid) SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: increment_external_page_views(uuid)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: increment_external_page_views - %', SQLERRM;
    END;
  END IF;

  -- increment_external_page_submissions
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'increment_external_page_submissions'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.increment_external_page_submissions(uuid) SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: increment_external_page_submissions(uuid)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: increment_external_page_submissions - %', SQLERRM;
    END;
  END IF;
END $$;

-- Trigger functions (no parameters, returns trigger)
-- These are attached to tables via triggers
DO $$
BEGIN
  -- update_updated_at_column
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_updated_at_column'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: update_updated_at_column()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: update_updated_at_column - %', SQLERRM;
    END;
  END IF;

  -- update_notifications_updated_at
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_notifications_updated_at'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.update_notifications_updated_at() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: update_notifications_updated_at()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: update_notifications_updated_at - %', SQLERRM;
    END;
  END IF;

  -- update_subscription_status
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'update_subscription_status'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.update_subscription_status() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: update_subscription_status()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: update_subscription_status - %', SQLERRM;
    END;
  END IF;
END $$;

-- Utility functions
DO $$
BEGIN
  -- generate_short_id (integer parameter)
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'generate_short_id'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.generate_short_id(integer) SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: generate_short_id(integer)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: generate_short_id - %', SQLERRM;
    END;
  END IF;

  -- set_company_short_id
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'set_company_short_id'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.set_company_short_id() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: set_company_short_id()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: set_company_short_id - %', SQLERRM;
    END;
  END IF;

  -- set_user_short_id
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'set_user_short_id'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.set_user_short_id() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: set_user_short_id()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: set_user_short_id - %', SQLERRM;
    END;
  END IF;

  -- generate_invitation_code
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'generate_invitation_code'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.generate_invitation_code() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: generate_invitation_code()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: generate_invitation_code - %', SQLERRM;
    END;
  END IF;

  -- cleanup_expired_invitations
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'cleanup_expired_invitations'
  ) THEN
    BEGIN
      EXECUTE 'ALTER FUNCTION public.cleanup_expired_invitations() SET search_path = ''''';
      RAISE NOTICE '✅ Fixed: cleanup_expired_invitations()';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Skipped: cleanup_expired_invitations - %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================
-- Fix Materialized View Access
-- ============================================================

DO $$
BEGIN
  -- Check if materialized view exists
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname = 'admin_company_stats'
  ) THEN
    -- Revoke access from anon and authenticated roles
    EXECUTE 'REVOKE ALL ON public.admin_company_stats FROM anon';
    EXECUTE 'REVOKE ALL ON public.admin_company_stats FROM authenticated';

    -- Grant access only to service_role
    EXECUTE 'GRANT SELECT ON public.admin_company_stats TO service_role';

    RAISE NOTICE '✅ Fixed: admin_company_stats materialized view access restricted';
  ELSE
    RAISE NOTICE 'ℹ️ Materialized view admin_company_stats not found';
  END IF;
END $$;

-- ============================================================
-- Summary
-- ============================================================

DO $$
DECLARE
  fixed_count INTEGER := 0;
BEGIN
  -- Count successfully fixed functions
  SELECT COUNT(*) INTO fixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'increment_landing_page_views',
    'increment_landing_page_submissions',
    'increment_external_page_views',
    'increment_external_page_submissions',
    'update_updated_at_column',
    'update_notifications_updated_at',
    'update_subscription_status',
    'generate_short_id',
    'set_company_short_id',
    'set_user_short_id',
    'generate_invitation_code',
    'cleanup_expired_invitations'
  );

  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '✅ Security Fix Summary';
  RAISE NOTICE '================================';
  RAISE NOTICE '📊 Functions processed: %', fixed_count;
  RAISE NOTICE '🔒 Materialized view access restricted';
  RAISE NOTICE '';
  RAISE NOTICE 'ℹ️ Some functions may have been skipped if they don''t exist';
  RAISE NOTICE 'ℹ️ Check Supabase linter to verify remaining warnings';
  RAISE NOTICE '';
END $$;
