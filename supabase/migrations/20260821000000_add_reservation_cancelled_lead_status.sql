-- ============================================================================
-- '결과' 상태 목록에 "예약 후 취소" 기본 옵션 추가 (노션 QA 접수 #10)
-- 예약 확정(contract_completed) 이후 취소된 리드를 구분해서 기록할 수 있도록
-- 기존 회사들에 백필하고, 앞으로 생성되는 회사에도 자동 포함되게 함수를 갱신한다.
-- Created: 2026-08-21
-- ============================================================================

-- STEP 1: 신규 회사 생성 시 기본 상태를 채우는 함수에 새 상태 추가
CREATE OR REPLACE FUNCTION insert_default_lead_statuses(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO lead_statuses (company_id, code, label, color, sort_order, is_default, category)
  VALUES
    (p_company_id, 'new', '상담 전', 'orange', 1, true, 'new'),
    (p_company_id, 'rejected', '상담 거절', 'red', 2, false, 'rejected'),
    (p_company_id, 'contacted', '상담 진행중', 'sky', 3, false, 'contacted'),
    (p_company_id, 'converted', '상담 완료', 'green', 4, false, 'converted'),
    (p_company_id, 'contract_completed', '예약 확정', 'emerald', 5, false, 'contract_completed'),
    (p_company_id, 'needs_followup', '추가상담 필요', 'yellow', 6, false, 'needs_followup'),
    (p_company_id, 'reservation_cancelled', '예약 후 취소', 'pink', 7, false, 'rejected'),
    (p_company_id, 'other', '기타', 'gray', 8, false, 'other')
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: 기존 회사들에 새 상태 백필 (이미 있으면 건너뜀)
-- 기존 회사는 이미 '기타'가 sort_order=7로 들어가 있으므로, 겹치지 않게 8로 추가한다.
INSERT INTO lead_statuses (company_id, code, label, color, sort_order, is_default, category)
SELECT id, 'reservation_cancelled', '예약 후 취소', 'pink', 8, false, 'rejected'
FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

COMMENT ON FUNCTION insert_default_lead_statuses(UUID) IS '회사 생성 시 기본 리드 상태(결과) 목록을 채운다 - 예약 후 취소 상태 포함(2026-08-21)';
