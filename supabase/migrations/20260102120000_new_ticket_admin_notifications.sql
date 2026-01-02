-- Migration: New Ticket Admin Notifications
-- Description: Notify admins when users create new support tickets
-- Created: 2026-01-02

-- 1. Create trigger function to notify admins of new tickets
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_name TEXT;
  v_admin RECORD;
BEGIN
  -- Get ticket creator name
  SELECT full_name INTO v_creator_name
  FROM users
  WHERE id = NEW.created_by_user_id;

  -- Create notification for all super admins in the same company
  FOR v_admin IN
    SELECT id, full_name
    FROM users
    WHERE is_super_admin = true
      AND company_id = NEW.company_id
      AND id != NEW.created_by_user_id  -- Don't notify if admin creates their own ticket
  LOOP
    INSERT INTO notifications (
      user_id,
      company_id,
      title,
      message,
      type,
      metadata,
      is_read
    ) VALUES (
      v_admin.id,  -- Send to admin
      NEW.company_id,
      '새 기술지원 문의',
      v_creator_name || '님이 "' || NEW.subject || '" 티켓을 생성했습니다.',
      'new_support_ticket',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'creator_name', v_creator_name,
        'ticket_subject', NEW.subject,
        'priority', NEW.priority,
        'category', NEW.category
      ),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on support_tickets table
DROP TRIGGER IF EXISTS trigger_notify_admins_new_ticket ON support_tickets;

CREATE TRIGGER trigger_notify_admins_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_ticket();

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_admins_new_ticket() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_admins_new_ticket() TO service_role;
