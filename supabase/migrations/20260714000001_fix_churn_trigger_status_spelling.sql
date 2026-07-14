-- 이탈 감지 트리거의 상태값 철자 오류 수정
--
-- company_subscriptions.status의 CHECK 제약은 'cancelled'(L 두 개)만 허용하는데,
-- 20251217000010_churn_detection_trigger.sql의 트리거는 'canceled'(L 한 개)를
-- 검사하고 있었다. 앱 코드는 항상 'cancelled'로 기록하므로 이 조건은 절대
-- 매치되지 않았고, 그 결과 churn_records에 취소 이탈 기록이 단 한 건도
-- 쌓이지 않았다(만료 이탈만 기록됨).
CREATE OR REPLACE FUNCTION detect_and_record_churn()
RETURNS TRIGGER AS $$
DECLARE
  v_tenure_days INTEGER;
  v_last_mrr DECIMAL(10,2);
  v_signup_date TIMESTAMPTZ;
  v_plan_monthly_price INTEGER;
  v_plan_yearly_price INTEGER;
BEGIN
  -- 상태가 'cancelled' 또는 'expired'로 변경된 경우에만 처리
  IF (OLD.status IN ('active', 'trial', 'past_due') AND
      NEW.status IN ('cancelled', 'expired')) THEN

    -- 회사 가입일 조회
    SELECT created_at INTO v_signup_date
    FROM companies
    WHERE id = NEW.company_id;

    -- 사용 기간 계산 (일)
    v_tenure_days := EXTRACT(DAY FROM (COALESCE(NEW.cancelled_at, NOW()) - v_signup_date));

    -- 플랜 가격 정보 조회
    SELECT price_monthly, price_yearly INTO v_plan_monthly_price, v_plan_yearly_price
    FROM subscription_plans
    WHERE id = NEW.plan_id;

    -- 마지막 MRR 계산
    v_last_mrr := CASE NEW.billing_cycle
      WHEN 'monthly' THEN v_plan_monthly_price
      WHEN 'yearly' THEN v_plan_yearly_price / 12.0
      ELSE 0
    END;

    -- churn_records에 기록 (중복 방지: 이미 존재하면 스킵)
    INSERT INTO churn_records (
      company_id,
      churned_at,
      tenure_days,
      last_mrr,
      reason,
      reason_category
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.cancelled_at, NOW()),
      v_tenure_days,
      v_last_mrr,
      NEW.cancel_reason,
      'other'  -- 기본값, API로 업데이트 가능
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Churn recorded for company_id: %, tenure: % days, MRR: %',
                  NEW.company_id, v_tenure_days, v_last_mrr;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
