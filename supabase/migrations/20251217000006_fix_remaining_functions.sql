-- Fix Remaining Function Security Warnings
-- Migration: 20251217000006_fix_remaining_functions.sql
-- Purpose: Fix the 6 remaining trigger functions that were skipped

-- ============================================================
-- Strategy: Query actual function signatures and fix them
-- ============================================================

DO $$
DECLARE
  func_signature TEXT;
  func_name TEXT;
  functions_to_fix TEXT[] := ARRAY[
    'auto_assign_lead',
    'update_lead_statuses_updated_at',
    'insert_default_lead_statuses',
    'trigger_insert_default_lead_statuses',
    'auto_assign_call_staff',
    'trigger_auto_assign_call_staff'
  ];
  fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE 'Fixing Remaining Functions';
  RAISE NOTICE '================================';
  RAISE NOTICE '';

  -- Loop through each function
  FOREACH func_name IN ARRAY functions_to_fix
  LOOP
    -- Get the exact function signature
    SELECT INTO func_signature
      format(
        '%s(%s)',
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      )
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = func_name;

    IF func_signature IS NOT NULL THEN
      BEGIN
        -- Try to fix the function
        EXECUTE format(
          'ALTER FUNCTION public.%s SET search_path = ''''',
          func_signature
        );

        RAISE NOTICE '✅ Fixed: %', func_signature;
        fixed_count := fixed_count + 1;

      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not fix %: %', func_signature, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '⚠️ Function not found: %', func_name;
    END IF;

    -- Reset for next iteration
    func_signature := NULL;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '✅ Summary';
  RAISE NOTICE '================================';
  RAISE NOTICE '📊 Functions fixed: % out of %', fixed_count, array_length(functions_to_fix, 1);
  RAISE NOTICE '';

  IF fixed_count = array_length(functions_to_fix, 1) THEN
    RAISE NOTICE '🎉 All remaining functions fixed!';
  ELSE
    RAISE NOTICE 'ℹ️ Some functions may need manual review';
  END IF;

  RAISE NOTICE '';
END $$;
