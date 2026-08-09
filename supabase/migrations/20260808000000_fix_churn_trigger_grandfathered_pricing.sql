-- 이탈(churn) 기록 트리거의 last_mrr 계산이 카탈로그가(subscription_plans.price_*)만
-- 참조해, 그랜드파더링(61차) 중인 구독이 이탈하면 metadata.last_mrr이 실제보다 과대
-- 계상됐다(71차 QA). admin/subscriptions/metrics 등 다른 곳과 동일한 locked_price_*
-- 판정 기준을 적용한다. NEW는 UPDATE 시점의 최신 잠금가라 별도 조회 없이 바로 쓴다.
CREATE OR REPLACE FUNCTION detect_and_record_churn()
RETURNS TRIGGER AS $$
DECLARE
  v_tenure_days INTEGER;
  v_last_mrr DECIMAL(10,2);
  v_signup_date TIMESTAMPTZ;
  v_plan_monthly_price INTEGER;
  v_plan_yearly_price INTEGER;
  v_price_lock_valid BOOLEAN;
  v_churn_type TEXT;
  v_ltv DECIMAL(12,2);
  v_churn_date TIMESTAMPTZ;
BEGIN
  IF (OLD.status IN ('active', 'trial', 'past_due') AND
      NEW.status IN ('cancelled', 'expired')) THEN

    v_churn_date := COALESCE(NEW.cancelled_at, NOW());
    v_churn_type := CASE NEW.status
      WHEN 'cancelled' THEN 'voluntary'
      WHEN 'expired' THEN 'involuntary'
      ELSE 'other'
    END;

    SELECT created_at INTO v_signup_date FROM companies WHERE id = NEW.company_id;
    v_tenure_days := EXTRACT(DAY FROM (v_churn_date - v_signup_date));

    SELECT price_monthly, price_yearly INTO v_plan_monthly_price, v_plan_yearly_price
    FROM subscription_plans WHERE id = NEW.plan_id;

    v_price_lock_valid := NEW.locked_plan_id = NEW.plan_id
      AND NEW.locked_price_monthly IS NOT NULL
      AND NEW.locked_price_yearly IS NOT NULL;

    IF v_price_lock_valid THEN
      v_plan_monthly_price := NEW.locked_price_monthly;
      v_plan_yearly_price := NEW.locked_price_yearly;
    END IF;

    v_last_mrr := CASE NEW.billing_cycle
      WHEN 'monthly' THEN v_plan_monthly_price
      WHEN 'yearly' THEN v_plan_yearly_price / 12.0
      ELSE 0
    END;

    SELECT COALESCE(SUM(total_amount), 0) INTO v_ltv
    FROM payment_transactions
    WHERE company_id = NEW.company_id AND status = 'success';

    INSERT INTO churn_records (
      company_id,
      churn_date,
      churn_type,
      ltv,
      reason,
      metadata
    ) VALUES (
      NEW.company_id,
      v_churn_date,
      v_churn_type,
      v_ltv,
      NEW.cancel_reason,
      jsonb_build_object(
        'tenure_days', v_tenure_days,
        'last_mrr', v_last_mrr,
        'plan_id', NEW.plan_id,
        'billing_cycle', NEW.billing_cycle,
        'previous_status', OLD.status
      )
    );

    RAISE NOTICE 'Churn recorded for company_id: %, type: %, tenure: % days, ltv: %',
                  NEW.company_id, v_churn_type, v_tenure_days, v_ltv;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_and_record_churn() IS '구독 취소/만료 시 자동으로 이탈 기록 생성 - last_mrr이 그랜드파더링 잠금가를 반영하도록 수정(71차 QA)';
