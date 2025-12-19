-- Fix trigger to detect plan and billing cycle changes, not just status changes

-- 1. Update the notification function to handle all types of changes
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  old_plan_name TEXT;
  new_plan_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  has_changes BOOLEAN := false;
BEGIN
  -- Get company name
  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;

  -- For INSERT events
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO new_plan_name FROM subscription_plans WHERE id = NEW.plan_id;
    notification_title := format('%s - 구독 시작', company_name);

    IF NEW.status = 'trial' THEN
      notification_message := format(
        '%s에서 %s 플랜 체험을 시작했습니다. (7일 무료 체험)',
        company_name,
        new_plan_name
      );
    ELSE
      notification_message := format(
        '%s에서 %s 플랜 구독을 시작했습니다.',
        company_name,
        new_plan_name
      );
    END IF;

    INSERT INTO notifications (company_id, title, message, type, is_read)
    VALUES (NEW.company_id, notification_title, notification_message, 'subscription_started', false);

    RETURN NEW;
  END IF;

  -- For UPDATE events - check what changed
  IF TG_OP = 'UPDATE' THEN
    -- Check if status changed
    IF OLD.status != NEW.status THEN
      has_changes := true;
      SELECT name INTO new_plan_name FROM subscription_plans WHERE id = NEW.plan_id;
      notification_title := format('%s - 구독 상태 변경', company_name);

      CASE NEW.status
        WHEN 'active' THEN
          IF OLD.status = 'trial' THEN
            notification_message := format(
              '%s의 %s 플랜이 정식 구독으로 전환되었습니다.',
              company_name,
              new_plan_name
            );
          ELSE
            notification_message := format(
              '%s의 %s 플랜이 활성화되었습니다.',
              company_name,
              new_plan_name
            );
          END IF;
        WHEN 'cancelled' THEN
          notification_message := format(
            '%s의 %s 플랜 구독이 취소되었습니다.',
            company_name,
            new_plan_name
          );
        WHEN 'suspended' THEN
          notification_message := format(
            '%s의 %s 플랜이 정지되었습니다.',
            company_name,
            new_plan_name
          );
        WHEN 'expired' THEN
          notification_message := format(
            '%s의 %s 플랜이 만료되었습니다.',
            company_name,
            new_plan_name
          );
        ELSE
          notification_message := format(
            '%s의 %s 플랜 상태가 %s로 변경되었습니다.',
            company_name,
            new_plan_name,
            NEW.status
          );
      END CASE;

    -- Check if plan changed
    ELSIF OLD.plan_id != NEW.plan_id THEN
      has_changes := true;
      SELECT name INTO old_plan_name FROM subscription_plans WHERE id = OLD.plan_id;
      SELECT name INTO new_plan_name FROM subscription_plans WHERE id = NEW.plan_id;

      notification_title := format('%s - 구독 플랜 변경', company_name);
      notification_message := format(
        '%s의 구독 플랜이 %s에서 %s로 변경되었습니다.',
        company_name,
        old_plan_name,
        new_plan_name
      );

    -- Check if billing cycle changed
    ELSIF OLD.billing_cycle != NEW.billing_cycle THEN
      has_changes := true;
      SELECT name INTO new_plan_name FROM subscription_plans WHERE id = NEW.plan_id;

      notification_title := format('%s - 결제 주기 변경', company_name);

      IF NEW.billing_cycle = 'yearly' THEN
        notification_message := format(
          '%s의 %s 플랜 결제 주기가 연간 결제로 변경되었습니다.',
          company_name,
          new_plan_name
        );
      ELSIF NEW.billing_cycle = 'monthly' THEN
        notification_message := format(
          '%s의 %s 플랜 결제 주기가 월간 결제로 변경되었습니다.',
          company_name,
          new_plan_name
        );
      ELSE
        notification_message := format(
          '%s의 %s 플랜 결제 주기가 %s로 변경되었습니다.',
          company_name,
          new_plan_name,
          NEW.billing_cycle
        );
      END IF;
    END IF;

    -- Only create notification if something actually changed
    IF has_changes THEN
      INSERT INTO notifications (company_id, title, message, type, is_read)
      VALUES (NEW.company_id, notification_title, notification_message, 'subscription_changed', false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger (no changes needed, just for completeness)
DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();
