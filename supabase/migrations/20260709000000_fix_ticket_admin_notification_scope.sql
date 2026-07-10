-- Migration: Fix new-ticket admin notification scoping
-- Description: notify_admins_new_ticket()가 슈퍼 어드민을 티켓 생성자와 같은
-- company_id로 제한해서 조회하고 있었다. 슈퍼 어드민은 특정 고객사에 속한 개념이
-- 아니라 플랫폼 전역 권한이므로, 이 조건 때문에 고객사가 문의를 남겨도 실제
-- 관리자에게는 알림이 전혀 가지 않고 있었다.
-- Created: 2026-07-09

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

  -- Create notification for all super admins (플랫폼 전역 권한이므로 company_id로 제한하지 않는다)
  FOR v_admin IN
    SELECT id, full_name
    FROM users
    WHERE is_super_admin = true
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
