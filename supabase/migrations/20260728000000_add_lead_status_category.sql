-- 커스텀 리드 상태를 대시보드/리포트/분석 통계가 정확히 반영하도록, 각 상태
-- 코드가 어떤 의미 범주(신규/거절/진행중/완료/계약확정/후속조치필요/기타)에
-- 해당하는지 명시하는 category 컬럼을 추가한다. 지금까지는 이 매핑이 없어
-- 여러 화면이 시스템 기본 7개 코드만 하드코딩해서 확인하고, 회사가 만든
-- 커스텀 상태는 전부 "기타"로 뭉뚱그려졌다.
ALTER TABLE lead_statuses
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'other';

ALTER TABLE lead_statuses
  ADD CONSTRAINT lead_statuses_category_check
  CHECK (category IN ('new', 'rejected', 'contacted', 'converted', 'contract_completed', 'needs_followup', 'other'));

COMMENT ON COLUMN lead_statuses.category IS '통계 집계용 의미 범주 - 시스템 기본 7개 코드는 category=code, 커스텀 상태는 관리자가 지정';

-- 기존 행(현재 전부 시스템 기본 7개 코드)은 category = code로 백필
UPDATE lead_statuses
SET category = code
WHERE code IN ('new', 'rejected', 'contacted', 'converted', 'contract_completed', 'needs_followup', 'other');

-- 신규 회사 생성 시 기본 상태를 심는 함수도 category를 함께 채우도록 갱신
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
    (p_company_id, 'other', '기타', 'gray', 7, false, 'other')
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
