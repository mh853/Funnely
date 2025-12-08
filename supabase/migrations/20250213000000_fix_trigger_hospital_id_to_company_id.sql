-- Fix trigger function to use company_id instead of hospital_id
-- The leads table was migrated from hospital_id to company_id, but the trigger wasn't updated

CREATE OR REPLACE FUNCTION trigger_auto_assign_call_staff()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_assigned_user_id UUID;
BEGIN
  -- leads 테이블에서 company_id 가져오기 (hospital_id에서 company_id로 변경됨)
  v_company_id := NEW.company_id;

  IF NEW.call_assigned_to IS NULL THEN
    v_assigned_user_id := auto_assign_call_staff(v_company_id);
    IF v_assigned_user_id IS NOT NULL THEN
      NEW.call_assigned_to := v_assigned_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION trigger_auto_assign_call_staff() IS 'Automatically assigns call staff to new leads based on company_id';
