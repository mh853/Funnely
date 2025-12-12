-- Phase 6: 리드 관리 시스템 성능 최적화를 위한 인덱스 추가
-- 목적: 리드 검색, 필터링, 정렬 성능 향상

-- 1. 이름 검색을 위한 전문 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_name_search
  ON leads USING gin(to_tsvector('simple', name));

-- 2. 이메일 검색을 위한 전문 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_email_search
  ON leads USING gin(to_tsvector('simple', COALESCE(email, '')));

-- 3. 회사별 상태 필터링을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_company_status
  ON leads(company_id, status);

-- 4. 회사별 생성일 정렬을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_company_created
  ON leads(company_id, created_at DESC);

-- 5. 회사별 상태 및 생성일 복합 인덱스 (다중 필터 + 정렬)
CREATE INDEX IF NOT EXISTS idx_leads_company_status_created
  ON leads(company_id, status, created_at DESC);

-- 6. 담당자별 리드 조회를 위한 인덱스 (이미 있지만 확인)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_priority
  ON leads(assigned_to, priority);

-- 7. UTM 소스 분석을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_utm_source
  ON leads(utm_source)
  WHERE utm_source IS NOT NULL;

-- 8. 랜딩페이지별 성과 분석을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_page_status
  ON leads(landing_page_id, status)
  WHERE landing_page_id IS NOT NULL;

-- 인덱스 생성 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Lead management indexes created successfully';
END $$;
