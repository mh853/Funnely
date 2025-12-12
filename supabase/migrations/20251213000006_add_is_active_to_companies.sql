-- Phase 3: companies 테이블에 is_active 컬럼 추가
-- 목적: 구독 만료 시 회사 비활성화 관리

-- is_active 컬럼 추가 (기본값: true, NOT NULL)
ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- 기존 회사들은 모두 활성 상태로 설정
UPDATE companies SET is_active = true WHERE is_active IS NULL;

-- 설명 추가
COMMENT ON COLUMN companies.is_active IS '회사 활성화 상태 (구독 만료 시 false로 변경)';
