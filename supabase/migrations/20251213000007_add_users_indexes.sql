-- Phase 4: 사용자 관리 시스템 성능 최적화를 위한 인덱스 추가
-- 목적: 사용자 목록 조회, 검색, 필터링 성능 향상

-- users 테이블 인덱스
-- 마지막 로그인 시간 정렬 (실제 컬럼명: last_login)
CREATE INDEX IF NOT EXISTS idx_users_last_login_sort ON users(last_login DESC NULLS LAST);

-- 사용자 이름 정렬 및 검색
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- 이메일 전체 텍스트 검색 (ilike 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users USING gin(to_tsvector('simple', email));

-- 회사별 + 역할별 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- 회사별 + 활성 상태 + 역할 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_users_company_active_role ON users(company_id, is_active, role);

-- 생성일 정렬
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 역할별 + 활성 상태 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- 성능 확인을 위한 코멘트
COMMENT ON INDEX idx_users_last_login_sort IS 'Phase 4: 마지막 로그인 정렬 성능 향상';
COMMENT ON INDEX idx_users_full_name IS 'Phase 4: 사용자 이름 정렬 성능 향상';
COMMENT ON INDEX idx_users_email_search IS 'Phase 4: 이메일 검색 성능 향상';
COMMENT ON INDEX idx_users_company_role IS 'Phase 4: 회사별 역할 필터링 성능 향상';
COMMENT ON INDEX idx_users_company_active_role IS 'Phase 4: 회사별 활성 역할 필터링 성능 향상';
