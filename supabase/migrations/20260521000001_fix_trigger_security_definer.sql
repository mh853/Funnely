-- 회사 생성 시 기본 리드 상태 삽입 트리거 함수를 SECURITY DEFINER로 변경
-- 이유: lead_statuses 테이블의 RLS INSERT 정책이 auth.uid() 기반이라
--       트리거 컨텍스트에서 실패하는 문제 수정

CREATE OR REPLACE FUNCTION insert_default_lead_statuses(p_company_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO lead_statuses (company_id, code, label, color, sort_order, is_default)
  VALUES
    (p_company_id, 'new', '상담 전', 'orange', 1, true),
    (p_company_id, 'rejected', '상담 거절', 'red', 2, false),
    (p_company_id, 'contacted', '상담 진행중', 'sky', 3, false),
    (p_company_id, 'converted', '상담 완료', 'green', 4, false),
    (p_company_id, 'contract_completed', '예약 확정', 'emerald', 5, false),
    (p_company_id, 'needs_followup', '추가상담 필요', 'yellow', 6, false),
    (p_company_id, 'other', '기타', 'gray', 7, false)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_insert_default_lead_statuses()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM insert_default_lead_statuses(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
