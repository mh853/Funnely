-- ============================================================================
-- 고객이 티켓에 추가 문의(후속 메시지)를 남기면 관리자에게도 인앱 알림 발송
-- (노션 QA 접수 #17 - 버그만 수정, '추가문의' 기능 자체는 유지)
--
-- create_support_reply_notification()은 원래 "관리자가 답변하면 고객에게 알림"만
-- 처리했고, 반대 방향(고객이 추가 문의 → 관리자)은 이메일만 보내고(2026-08-02
-- fix) 인앱 notifications 테이블에는 아무것도 남기지 않았다. 그 결과 새 티켓
-- 생성 때와 달리, 기존 티켓(특히 '종료'된 티켓)에 고객이 추가 문의를 남기면
-- 관리자 알림센터/벨 아이콘에 전혀 표시되지 않았다.
-- notify_admins_new_ticket()과 동일하게 슈퍼 어드민은 특정 회사에 속하지 않는
-- 플랫폼 전역 권한이므로 company_id로 제한하지 않는다.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_support_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
  v_author_name TEXT;
  v_is_admin BOOLEAN;
  v_admin RECORD;
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
  SELECT is_super_admin, full_name INTO v_is_admin, v_author_name
  FROM users
  WHERE id = NEW.user_id;

  IF v_is_admin = true THEN
    -- 관리자가 답변 → 티켓 작성자(고객)에게 알림 (기존 동작, 변경 없음)
    IF v_ticket.created_by_user_id IS NOT NULL
       AND v_ticket.created_by_user_id != NEW.user_id
    THEN
      INSERT INTO notifications (
        user_id, company_id, title, message, type, metadata, is_read
      ) VALUES (
        v_ticket.created_by_user_id,
        v_ticket.company_id,
        '기술지원 답변',
        v_author_name || '님이 "' || v_ticket.subject || '" 티켓에 답변했습니다.',
        'support_reply',
        jsonb_build_object(
          'ticket_id', v_ticket.id,
          'message_id', NEW.id,
          'admin_name', v_author_name,
          'ticket_subject', v_ticket.subject
        ),
        false
      );
    END IF;
  ELSE
    -- 고객(비관리자)이 추가 문의 → 전체 슈퍼 어드민에게 알림 (신규 추가)
    FOR v_admin IN
      SELECT id FROM users
      WHERE is_super_admin = true
        AND id != NEW.user_id
    LOOP
      INSERT INTO notifications (
        user_id, company_id, title, message, type, metadata, is_read
      ) VALUES (
        v_admin.id,
        v_ticket.company_id,
        '고객 추가 문의',
        v_author_name || '님이 "' || v_ticket.subject || '" 티켓에 추가 문의를 남겼습니다.',
        'support_ticket_customer_reply',
        jsonb_build_object(
          'ticket_id', v_ticket.id,
          'message_id', NEW.id,
          'customer_name', v_author_name,
          'ticket_subject', v_ticket.subject,
          'ticket_status', v_ticket.status
        ),
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION create_support_reply_notification() IS '관리자 답변 시 고객에게, 고객 추가문의 시 전체 슈퍼 어드민에게 인앱 알림 생성';
