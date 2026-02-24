-- Fix notifications RLS policies
-- Problem: 20260102000000_support_reply_notifications.sql replaced company_id-based
--          SELECT/UPDATE policies with user_id-based ones. This breaks:
--          1. Timer expiry notifications (user_id = NULL, company_id only)
--          2. Realtime events — Supabase filters events via SELECT RLS, so notifications
--             with NULL user_id are never delivered to the client.
-- Solution: Use company_id for SELECT/UPDATE (matching how notifications are inserted),
--           and allow both user_id-targeted and company-wide (user_id IS NULL) rows.

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their company notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their company notifications" ON notifications;

-- SELECT: allow rows that belong to the user's company
--   covers both user_id-targeted (support replies) and company-wide (timer expiry, subscription)
CREATE POLICY "Users can view their company notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- UPDATE: same company_id check (for marking as read)
CREATE POLICY "Users can update their company notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
