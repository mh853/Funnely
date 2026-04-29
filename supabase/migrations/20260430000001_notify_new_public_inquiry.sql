-- Migration: Notify admins when new public inquiry is submitted
-- Created: 2026-04-30
-- Description: 홈페이지 문의 접수 시 슈퍼어드민에게 notifications 테이블에 알림 생성

CREATE OR REPLACE FUNCTION notify_admins_new_public_inquiry()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_type_label TEXT;
BEGIN
  v_type_label := CASE NEW.inquiry_type
    WHEN 'sales' THEN '영업 상담'
    ELSE '일반 문의'
  END;

  -- Create notification for all super admins
  FOR v_admin IN
    SELECT id FROM users WHERE is_super_admin = true
  LOOP
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata,
      is_read
    ) VALUES (
      v_admin.id,
      '새 홈페이지 문의 접수 [' || v_type_label || ']',
      NEW.name || '(' || NEW.email || ')님의 문의가 접수됐습니다: ' || NEW.subject,
      'new_public_inquiry',
      jsonb_build_object(
        'inquiry_id', NEW.id,
        'inquiry_type', NEW.inquiry_type,
        'name', NEW.name,
        'email', NEW.email,
        'subject', NEW.subject
      ),
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_new_public_inquiry ON public_inquiries;

CREATE TRIGGER trigger_notify_admins_new_public_inquiry
  AFTER INSERT ON public_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_public_inquiry();

GRANT EXECUTE ON FUNCTION notify_admins_new_public_inquiry() TO service_role;
