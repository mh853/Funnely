-- Migration: Convert leads.status (and related columns) from a fixed ENUM to TEXT
-- Description: lead_statuses 테이블은 회사별로 임의의 커스텀 상태 코드를 자유롭게
-- 추가할 수 있도록 설계되어 있지만, leads.status는 고정된 Postgres ENUM(lead_status)
-- 이라 기본 제공 값(new/assigned/contacting/.../other) 외의 커스텀 코드를 리드에
-- 적용하면 "invalid input value for enum" 에러가 발생했다. 커스텀 상태 기능이
-- 실제로 동작하려면 이 컬럼이 lead_statuses.code와 동일하게 자유 텍스트여야 한다.
-- Created: 2026-07-09

ALTER TABLE leads ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE lead_notes ALTER COLUMN status_changed_from TYPE TEXT USING status_changed_from::TEXT;
ALTER TABLE lead_notes ALTER COLUMN status_changed_to TYPE TEXT USING status_changed_to::TEXT;
