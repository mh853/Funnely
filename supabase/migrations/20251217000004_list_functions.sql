-- List all public functions
-- This will help us identify which functions actually exist

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.proname IN (
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
    ) THEN '⚠️ NEEDS FIX'
    ELSE ''
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY
  CASE WHEN status = '⚠️ NEEDS FIX' THEN 0 ELSE 1 END,
  p.proname;
