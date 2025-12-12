-- Phase 3: 회사 관리 시스템 성능 최적화를 위한 인덱스 추가
-- 목적: 회사 목록 조회, 검색, 필터링 성능 향상

-- companies 테이블 인덱스
-- 가입일 기준 정렬 및 필터링
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

-- 활성 상태 필터링
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);

-- 회사명 전체 텍스트 검색 (ilike 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_companies_name_search ON companies USING gin(to_tsvector('simple', name));

-- users 테이블 인덱스
-- 회사별 사용자 조회 (이미 있을 수 있지만 확인)
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- 회사별 활성 사용자 조회
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, is_active);

-- 역할별 필터링
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 이메일 검색 (담당자 검색)
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users USING gin(to_tsvector('simple', email));

-- leads 테이블 인덱스
-- 회사별 리드 수 조회 (이미 있을 수 있지만 확인)
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);

-- 회사별 + 생성일 복합 인덱스 (월별 통계)
CREATE INDEX IF NOT EXISTS idx_leads_company_created ON leads(company_id, created_at DESC);

-- landing_pages 테이블 인덱스
-- 회사별 랜딩페이지 조회
CREATE INDEX IF NOT EXISTS idx_landing_pages_company_id ON landing_pages(company_id);

-- 회사별 활성 페이지 조회
CREATE INDEX IF NOT EXISTS idx_landing_pages_company_published ON landing_pages(company_id, is_published);

-- company_activity_logs 테이블 인덱스는 이미 Phase 1에서 생성됨
-- idx_activity_company, idx_activity_created, idx_activity_user

-- 성능 확인을 위한 코멘트
COMMENT ON INDEX idx_companies_created_at IS 'Phase 3: 회사 목록 정렬 성능 향상';
COMMENT ON INDEX idx_companies_is_active IS 'Phase 3: 활성/비활성 필터링 성능 향상';
COMMENT ON INDEX idx_companies_name_search IS 'Phase 3: 회사명 검색 성능 향상';
COMMENT ON INDEX idx_users_company_active IS 'Phase 3: 활성 사용자 통계 성능 향상';
COMMENT ON INDEX idx_leads_company_created IS 'Phase 3: 월별 리드 통계 성능 향상';
