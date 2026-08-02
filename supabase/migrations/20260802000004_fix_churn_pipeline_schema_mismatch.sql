-- churn(이탈) 분석 기능이 처음부터 한 번도 정상 동작한 적이 없었던 것으로 확인됐다
-- (58차 QA). 세 가지가 겹쳐 있었다:
-- 1. detect_and_record_churn() 트리거 함수(20251217000010)가 status 철자
--    ('canceled' vs 'cancelled')를 잘못 검사 - 이건 2026-07-14에 이미 고쳐 두었으나
--    실제 프로덕션에는 한 번도 적용된 적이 없었다(로컬 파일로만 존재).
-- 2. 그 함수의 INSERT 대상 컬럼(churned_at/tenure_days/last_mrr/reason_category)이
--    churn_records의 실제 스키마(2025-12-16에 생성된 churn_date/churn_type/ltv/
--    reason/metadata)와 전혀 다르다 - 애초에 서로 다른 설계로 각각 작성된 것으로 보임.
-- 3. 트리거 자체가 company_subscriptions에 생성된 적이 없다(pg_trigger 조회 0건) -
--    함수 정의만 있고 실제로 호출하는 트리거가 없었다.
--
-- 이번에 실제 스키마에 맞춰 전체를 다시 작성하고 트리거를 실제로 생성한다.
-- churn_type은 능동 취소(cancelled)면 voluntary, 결제실패로 인한 만료(expired)면
-- involuntary로 매핑한다(표준적인 SaaS 이탈 분류). ltv는 dashboard-stats.ts가 이미
-- 쓰는 것과 동일한 방식(payment_transactions.total_amount 합계, status='success')으로
-- 계산한다 - 기존 코드처럼 MRR*재직기간으로 추정하는 대신 실제 결제된 금액을 쓴다.
-- tenure_days/last_mrr은 src/lib/churn/calculations.ts가 그대로 읽는
-- metadata.tenure_days / metadata.last_mrr에 맞춰 JSONB 안에 넣는다.
CREATE OR REPLACE FUNCTION detect_and_record_churn()
RETURNS TRIGGER AS $$
DECLARE
  v_tenure_days INTEGER;
  v_last_mrr DECIMAL(10,2);
  v_signup_date TIMESTAMPTZ;
  v_plan_monthly_price INTEGER;
  v_plan_yearly_price INTEGER;
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

DROP TRIGGER IF EXISTS trigger_detect_churn ON company_subscriptions;

CREATE TRIGGER trigger_detect_churn
  AFTER UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION detect_and_record_churn();

COMMENT ON FUNCTION detect_and_record_churn() IS '구독 취소/만료 시 자동으로 이탈 기록 생성 (churn_records 실제 스키마에 맞춰 재작성, 58차 QA)';
COMMENT ON TRIGGER trigger_detect_churn ON company_subscriptions IS '구독 상태 변경 시 이탈 감지 트리거 - 58차 QA에서 실제로 생성된 적이 없었음을 확인하고 신규 생성';
