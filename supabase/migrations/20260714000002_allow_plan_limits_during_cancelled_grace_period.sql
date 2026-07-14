-- 구독 취소 후에도 이미 결제한 기간 동안은 플랜 한도(랜딩페이지/팀원 좌석)를
-- 그대로 적용하도록 수정
--
-- 기존에는 cancelled 상태가 되는 즉시 "활성 구독 없음"으로 취급해 랜딩페이지 생성,
-- 팀원 초대가 전부 막혔다. 구독 취소는 "다음 결제를 하지 않겠다"는 의미일 뿐 이미
-- 결제한 기간의 이용 권리를 즉시 박탈하는 게 아니므로(취소 확인 모달에서도 기간까지
-- 이용 가능하다고 안내함), current_period_end가 남아있는 cancelled 구독도 인정한다.
CREATE OR REPLACE FUNCTION public.enforce_landing_page_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_pages INTEGER;
  v_current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text));

  SELECT sp.max_landing_pages INTO v_max_pages
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
    RAISE EXCEPTION 'LANDING_PAGE_LIMIT_EXCEEDED: no active subscription for company %', NEW.company_id;
  END IF;

  IF v_max_pages IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_current_count FROM landing_pages WHERE company_id = NEW.company_id;

  IF v_current_count >= v_max_pages THEN
    RAISE EXCEPTION 'LANDING_PAGE_LIMIT_EXCEEDED: %/%', v_current_count, v_max_pages;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_invite()
RETURNS TRIGGER AS $$
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

  SELECT count(*) INTO v_active_count FROM users WHERE company_id = NEW.company_id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
