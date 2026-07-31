-- enforce_seat_limit_on_invite()가 활성 좌석 수를 셀 때 users.is_active를
-- 확인하지 않아, 관리자가 팀원을 강제 비활성화해도 그 좌석이 계속 max_users
-- 계산에 포함됐다. 그 결과 회사가 실제로는 빈 좌석이 있어도 새 팀원을 영구히
-- 초대할 수 없는 데드락 상태에 빠졌다(44차 QA에서 실제 재현 확인). 앱 레벨의
-- canInviteUser()/invite-accept 좌석 재검증에도 동일한 결함이 있어 함께 고쳤다 -
-- 이 트리거는 그 두 곳을 우회하는 최후 방어선(TOCTOU 방지)이라 반드시 같은
-- 기준으로 맞춰야 한다.

CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_invite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_users INTEGER;
  v_active_count INTEGER;
  v_pending_count INTEGER;
BEGIN
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text));

  SELECT sp.max_users INTO v_max_users
  FROM company_subscriptions cs
  JOIN subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.company_id = NEW.company_id
    AND (
      cs.status IN ('active', 'trial', 'past_due')
      OR (cs.status = 'cancelled' AND cs.current_period_end > now())
    )
  ORDER BY cs.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_max_users := 1;
  END IF;

  IF v_max_users IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_active_count FROM users WHERE company_id = NEW.company_id AND is_active = true;
  SELECT count(*) INTO v_pending_count
  FROM company_invitations
  WHERE company_id = NEW.company_id
    AND status = 'pending'
    AND expires_at > now();

  IF v_active_count + v_pending_count + 1 > v_max_users THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: %/%', v_active_count + v_pending_count + 1, v_max_users;
  END IF;

  RETURN NEW;
END;
$function$;
