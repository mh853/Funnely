-- 구독 테이블 Realtime 활성화 및 알림 자동 생성 함수
-- 생성일: 2025-12-18

-- 1. company_subscriptions 테이블 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE company_subscriptions;

-- 2. 구독 생성 시 알림 자동 생성 함수
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  plan_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- 회사명 조회
  SELECT name INTO company_name
  FROM companies
  WHERE id = NEW.company_id;

  -- 플랜명 조회
  SELECT name INTO plan_name
  FROM subscription_plans
  WHERE id = NEW.plan_id;

  -- INSERT 이벤트 (신규 구독 생성)
  IF TG_OP = 'INSERT' THEN
    notification_title := format('%s - 구독 시작', company_name);

    IF NEW.status = 'trial' THEN
      notification_message := format(
        '%s에서 %s 플랜 체험을 시작했습니다. (7일 무료 체험)',
        company_name,
        plan_name
      );
    ELSE
      notification_message := format(
        '%s에서 %s 플랜 구독을 시작했습니다.',
        company_name,
        plan_name
      );
    END IF;

    -- 알림 생성
    INSERT INTO notifications (
      company_id,
      title,
      message,
      type,
      is_read
    ) VALUES (
      NEW.company_id,
      notification_title,
      notification_message,
      'subscription_started',
      false
    );

  -- UPDATE 이벤트 (구독 상태 변경)
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    notification_title := format('%s - 구독 상태 변경', company_name);

    CASE NEW.status
      WHEN 'active' THEN
        IF OLD.status = 'trial' THEN
          notification_message := format(
            '%s의 %s 플랜이 정식 구독으로 전환되었습니다.',
            company_name,
            plan_name
          );
        ELSE
          notification_message := format(
            '%s의 %s 플랜이 활성화되었습니다.',
            company_name,
            plan_name
          );
        END IF;
      WHEN 'cancelled' THEN
        notification_message := format(
          '%s의 %s 플랜 구독이 취소되었습니다.',
          company_name,
          plan_name
        );
      WHEN 'suspended' THEN
        notification_message := format(
          '%s의 %s 플랜이 정지되었습니다.',
          company_name,
          plan_name
        );
      WHEN 'expired' THEN
        notification_message := format(
          '%s의 %s 플랜이 만료되었습니다.',
          company_name,
          plan_name
        );
      ELSE
        notification_message := format(
          '%s의 %s 플랜 상태가 %s로 변경되었습니다.',
          company_name,
          plan_name,
          NEW.status
        );
    END CASE;

    -- 알림 생성
    INSERT INTO notifications (
      company_id,
      title,
      message,
      type,
      is_read
    ) VALUES (
      NEW.company_id,
      notification_title,
      notification_message,
      'subscription_changed',
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 트리거 생성
DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();

-- 4. 확인 쿼리 (주석)
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- SELECT * FROM notifications WHERE type IN ('subscription_started', 'subscription_changed') ORDER BY created_at DESC LIMIT 5;
