-- ============================================================================
-- Churn Detection Trigger
-- Created: 2025-12-17
-- Purpose: 구독 취소/만료 시 자동으로 churn_records에 이탈 기록 생성
-- ============================================================================

-- 이탈 감지 및 기록 함수
CREATE OR REPLACE FUNCTION detect_and_record_churn()
RETURNS TRIGGER AS $$
DECLARE
  v_tenure_days INTEGER;
  v_last_mrr DECIMAL(10,2);
  v_signup_date TIMESTAMPTZ;
  v_plan_monthly_price INTEGER;
  v_plan_yearly_price INTEGER;
BEGIN
  -- 상태가 'canceled' 또는 'expired'로 변경된 경우에만 처리
  IF (OLD.status IN ('active', 'trial', 'past_due') AND
      NEW.status IN ('canceled', 'expired')) THEN

    -- 회사 가입일 조회
    SELECT created_at INTO v_signup_date
    FROM companies
    WHERE id = NEW.company_id;

    -- 사용 기간 계산 (일)
    v_tenure_days := EXTRACT(DAY FROM (COALESCE(NEW.canceled_at, NOW()) - v_signup_date));

    -- 플랜 가격 정보 조회
    SELECT monthly_price, yearly_price INTO v_plan_monthly_price, v_plan_yearly_price
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
      COALESCE(NEW.canceled_at, NOW()),
      v_tenure_days,
      v_last_mrr,
      NEW.cancel_reason,
      'other'  -- 기본값, API로 업데이트 가능
    )
    ON CONFLICT DO NOTHING;  -- 중복 방지

    RAISE NOTICE 'Churn recorded for company_id: %, tenure: % days, MRR: %',
                  NEW.company_id, v_tenure_days, v_last_mrr;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (기존 트리거가 있다면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_detect_churn ON company_subscriptions;

CREATE TRIGGER trigger_detect_churn
  AFTER UPDATE ON company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION detect_and_record_churn();

-- 코멘트 추가
COMMENT ON FUNCTION detect_and_record_churn() IS '구독 취소/만료 시 자동으로 이탈 기록 생성';
COMMENT ON TRIGGER trigger_detect_churn ON company_subscriptions IS '구독 상태 변경 시 이탈 감지 트리거';
