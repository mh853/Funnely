-- Migration: 플랜 한도(랜딩페이지 개수/팀원 좌석)를 DB 트리거로 원자적으로 강제
-- Description: canCreateLandingPage()/canInviteUser()는 "개수 조회 → INSERT"를
-- 별도 요청으로 수행해, 두 요청이 거의 동시에 들어오면 둘 다 같은 개수를 읽고
-- 둘 다 통과해 한도를 넘겨 생성될 수 있었다(TOCTOU race). 트랜잭션 범위
-- advisory lock으로 같은 company_id에 대한 동시 INSERT를 직렬화해, 두 번째
-- 요청이 첫 번째 요청의 커밋을 기다렸다가 갱신된 개수로 다시 체크하게 한다.
-- 애플리케이션 레벨 체크(subscription-access.ts)는 그대로 두고 이 트리거는
-- 최후 방어선 역할만 한다 — 정상 경로에서는 절대 걸리지 않아야 한다.
-- Created: 2026-07-12

CREATE OR REPLACE FUNCTION public.enforce_landing_page_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_pages INTEGER;
  v_current_count INTEGER;
BEGIN
  -- 같은 회사에 대한 동시 INSERT를 직렬화 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text));

  SELECT sp.max_landing_pages INTO v_max_pages
  FROM company_subscriptions cs
  JOIN subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.company_id = NEW.company_id
    AND cs.status IN ('active', 'trial', 'past_due')
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- 활성 구독이 없으면 애플리케이션 레벨과 동일하게 전면 차단
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LANDING_PAGE_LIMIT_EXCEEDED: no active subscription for company %', NEW.company_id;
  END IF;

  -- NULL = 무제한
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

DROP TRIGGER IF EXISTS trigger_enforce_landing_page_limit ON landing_pages;
CREATE TRIGGER trigger_enforce_landing_page_limit
  BEFORE INSERT ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION enforce_landing_page_limit();

-- 팀원 좌석 한도도 동일한 패턴: 초대 발송(company_invitations INSERT) 시점에
-- "활성 사용자 + 만료되지 않은 pending 초대(자기 자신 포함)"가 한도를 넘지
-- 않도록 강제한다. 초대 수락은 pending 초대 하나가 active 사용자로 바뀌는
-- 것뿐이라 총합이 늘지 않으므로 여기서는 다루지 않는다(수락 시점 재검증은
-- 이미 애플리케이션 레벨에 있음 — 플랜 다운그레이드 대응용).
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
    AND cs.status IN ('active', 'trial', 'past_due')
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- 활성 구독이 없으면 애플리케이션 레벨과 동일하게 기본 제한(1명) 적용
  IF NOT FOUND THEN
    v_max_users := 1;
  END IF;

  -- NULL = 무제한
  IF v_max_users IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_active_count FROM users WHERE company_id = NEW.company_id;
  SELECT count(*) INTO v_pending_count
  FROM company_invitations
  WHERE company_id = NEW.company_id
    AND status = 'pending'
    AND expires_at > now();

  -- v_pending_count는 이 트리거가 도는 시점엔 NEW 행이 아직 커밋 전이라
  -- 포함되지 않으므로 +1로 이번 초대를 함께 계산한다.
  IF v_active_count + v_pending_count + 1 > v_max_users THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: %/%', v_active_count + v_pending_count + 1, v_max_users;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_seat_limit_on_invite ON company_invitations;
CREATE TRIGGER trigger_enforce_seat_limit_on_invite
  BEFORE INSERT ON company_invitations
  FOR EACH ROW EXECUTE FUNCTION enforce_seat_limit_on_invite();
