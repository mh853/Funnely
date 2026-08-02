-- 초대 발송 시점(company_invitations INSERT)은 enforce_seat_limit_on_invite
-- 트리거로 원자적으로 보호되지만, 그 트리거의 주석은 "초대 수락은 pending 하나가
-- active로 바뀔 뿐 총합(active+pending)이 안 늘어나므로 수락 시점은 다루지 않는다"고
-- 명시했다. 이 전제는 max_users가 그대로일 때만 성립한다 - 초대 발송 이후 플랜이
-- 다운그레이드되어 max_users가 줄어들면, 이미 발송된 pending 초대 여러 건이 새
-- 한도를 초과하게 되고, 이때 서로 다른 초대 코드로 여러 사용자가 거의 동시에
-- 수락을 시도하면 앱 레벨 재검증(SELECT count → INSERT, 원자적이지 않음)을 모두
-- 통과해 좌석 한도를 넘겨 계정이 생성될 수 있다(62차 QA 확인, TOCTOU race).
-- 랜딩페이지/초대발송 한도와 동일한 advisory-lock 트리거 패턴으로 users INSERT
-- 시점도 최후 방어선을 둔다. 앱 레벨 체크(invite/accept/route.ts)는 그대로 둔다.
CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  v_max_users INTEGER;
  v_active_count INTEGER;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
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

  -- 활성 구독을 아직 못 찾은 경우(예: 회원가입 중 최초 사용자 생성이 구독 생성보다
  -- 먼저 일어나는 타이밍) 애플리케이션 레벨과 동일하게 기본 제한(1명) 적용
  IF NOT FOUND THEN
    v_max_users := 1;
  END IF;

  -- NULL = 무제한
  IF v_max_users IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_active_count FROM users WHERE company_id = NEW.company_id AND is_active = true;

  IF v_active_count + 1 > v_max_users THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: %/%', v_active_count + 1, v_max_users;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_seat_limit_on_accept ON users;
CREATE TRIGGER trigger_enforce_seat_limit_on_accept
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_seat_limit_on_accept();
