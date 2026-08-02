-- 초대 수락(INSERT)은 enforce_seat_limit_on_accept(migration 20260802000006)로
-- 보호되지만, "비활성화된 팀원을 다시 활성화"하는 것은 INSERT가 아니라 UPDATE라
-- 그 트리거가 전혀 발동하지 않았다. 그 결과 (1) 어드민의 사용자 재활성화 API,
-- (2) RLS로 허용된 고객사 관리자의 직접 UPDATE 호출 둘 다 좌석 한도를 완전히
-- 무시하고 활성 사용자를 한도 이상으로 만들 수 있었다(66차 QA 확인, 실제 재현됨 -
-- 특히 (2)는 슈퍼어드민이 아닌 임의의 회사 관리자도 가능해 파급력이 큼).
-- INSERT 트리거와 동일한 advisory-lock 패턴으로 UPDATE(비활성→활성 전환)도
-- 최후 방어선을 둔다.
CREATE OR REPLACE FUNCTION public.enforce_seat_limit_on_reactivate()
RETURNS TRIGGER AS $$
DECLARE
  v_max_users INTEGER;
  v_active_count INTEGER;
BEGIN
  -- 비활성 -> 활성으로 바뀌는 경우만 검사한다 (그 외 갱신은 좌석 수에 영향 없음)
  IF NOT (OLD.is_active = false AND NEW.is_active = true) THEN
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

  IF v_active_count + 1 > v_max_users THEN
    RAISE EXCEPTION 'SEAT_LIMIT_EXCEEDED: %/%', v_active_count + 1, v_max_users;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_enforce_seat_limit_on_reactivate ON users;
CREATE TRIGGER trigger_enforce_seat_limit_on_reactivate
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_seat_limit_on_reactivate();
