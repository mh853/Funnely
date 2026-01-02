-- Support Reply Notifications Migration
-- Creates notification system for support ticket replies

-- 1. Add user_id column to notifications table if not exists
-- This column identifies the notification recipient (ticket creator)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add metadata column for additional notification data
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Create index for efficient user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read, created_at DESC);

-- 4. Create function to generate support reply notifications
CREATE OR REPLACE FUNCTION create_support_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
  v_admin_name TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Skip internal notes (admin-only messages)
  IF NEW.is_internal_note = true THEN
    RETURN NEW;
  END IF;

  -- Get ticket information
  SELECT * INTO v_ticket
  FROM support_tickets
  WHERE id = NEW.ticket_id;

  -- Check if message author is a super admin
  SELECT is_super_admin INTO v_is_admin
  FROM users
  WHERE id = NEW.user_id;

  -- Only create notification if:
  -- 1. Message author is admin
  -- 2. Ticket has a creator
  -- 3. Creator is not the message author (prevent self-notification)
  IF v_is_admin = true
     AND v_ticket.created_by_user_id IS NOT NULL
     AND v_ticket.created_by_user_id != NEW.user_id  -- ✨ Fixed: prevent self-notification
  THEN
    -- Get admin name for notification message
    SELECT full_name INTO v_admin_name
    FROM users
    WHERE id = NEW.user_id;

    -- Create notification for ticket creator
    INSERT INTO notifications (
      user_id,
      company_id,
      title,
      message,
      type,
      metadata,
      is_read
    ) VALUES (
      v_ticket.created_by_user_id,  -- Send to ticket creator
      v_ticket.company_id,
      '기술지원 답변',
      v_admin_name || '님이 "' || v_ticket.subject || '" 티켓에 답변했습니다.',
      'support_reply',
      jsonb_build_object(
        'ticket_id', v_ticket.id,
        'message_id', NEW.id,
        'admin_name', v_admin_name,
        'ticket_subject', v_ticket.subject
      ),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on support_ticket_messages
DROP TRIGGER IF EXISTS on_support_message_insert ON support_ticket_messages;
CREATE TRIGGER on_support_message_insert
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION create_support_reply_notification();

-- 6. Enable Realtime for notifications table
-- Note: Use DO block to safely handle existing publication
DO $$
BEGIN
  -- Try to drop the table from publication (ignore if not exists)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  -- Add the table to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Table already in publication
END $$;

-- 7. Create RLS policies for notifications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Super admins can view all notifications" ON notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins can view all notifications (for debugging/support)
CREATE POLICY "Super admins can view all notifications"
  ON notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 8. Add comments for documentation
COMMENT ON COLUMN notifications.user_id IS 'Notification recipient user ID';
COMMENT ON COLUMN notifications.metadata IS 'Additional notification data in JSON format';
COMMENT ON FUNCTION create_support_reply_notification() IS 'Creates notification when admin replies to support ticket';
COMMENT ON TRIGGER on_support_message_insert ON support_ticket_messages IS 'Triggers notification creation on new support message';
