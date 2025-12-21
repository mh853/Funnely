-- Fix landing page submission errors
-- This script only creates missing functions and triggers
-- Does NOT create tables (landing_pages and leads already exist)

-- ============================================================================
-- STEP 1: Create increment_landing_page_views function (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.landing_pages
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set search_path to public for security
ALTER FUNCTION public.increment_landing_page_views(uuid) SET search_path = 'public';

-- ============================================================================
-- STEP 2: Create auto_assign_call_staff function (if missing)
-- ============================================================================

DROP FUNCTION IF EXISTS auto_assign_call_staff(UUID);

CREATE OR REPLACE FUNCTION auto_assign_call_staff(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assigned_user_id UUID;
BEGIN
  -- Round Robin: 현재 활성 리드가 가장 적은 'user' 역할 담당자 선택
  SELECT u.id INTO v_assigned_user_id
  FROM public.users u
  LEFT JOIN (
    SELECT call_assigned_to, COUNT(*) as lead_count
    FROM public.leads
    WHERE status NOT IN ('completed', 'cancelled', 'contract_completed')
      AND call_assigned_to IS NOT NULL
    GROUP BY call_assigned_to
  ) l ON u.id = l.call_assigned_to
  WHERE u.company_id = p_company_id
    AND u.simple_role = 'user'
    AND u.is_active = TRUE
  ORDER BY COALESCE(l.lead_count, 0) ASC, u.created_at ASC
  LIMIT 1;

  RETURN v_assigned_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';

COMMENT ON FUNCTION auto_assign_call_staff(UUID) IS '새 리드에 콜 담당자 자동 배정 (Round Robin)';

-- ============================================================================
-- STEP 3: Create trigger function (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_assign_call_staff()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_assigned_user_id UUID;
BEGIN
  v_company_id := NEW.company_id;

  IF NEW.call_assigned_to IS NULL THEN
    v_assigned_user_id := public.auto_assign_call_staff(v_company_id);
    IF v_assigned_user_id IS NOT NULL THEN
      NEW.call_assigned_to := v_assigned_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public';

COMMENT ON FUNCTION trigger_auto_assign_call_staff() IS 'Automatically assigns call staff to new leads';

-- ============================================================================
-- STEP 4: Create trigger on leads table (if missing)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_leads_auto_assign ON leads;

CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();

SELECT 'Landing page functions and triggers fixed successfully!' AS status;
