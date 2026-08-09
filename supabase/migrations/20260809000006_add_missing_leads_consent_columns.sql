-- 81차 QA에서 발견: 20250129000000_add_privacy_policies.sql이 원격 마이그레이션
-- 이력에는 "적용됨"으로 기록되어 있으나, 그 안의 leads 테이블 ALTER(동의여부 3개
-- 컬럼)만 실제로는 반영되지 않았다. 같은 파일의 privacy_policies 테이블 생성과
-- landing_pages 컬럼 추가는 정상 반영되어 있어, 최초 적용 당시 leads ALTER 문에서만
-- 부분 실패가 있었던 것으로 보인다. 컬럼이 없어 리드 동의여부를 저장하는 코드
-- 자체가 지금까지 배포될 수 없었다(현재 앱 코드는 검증만 하고 저장은 안 함).
-- IF NOT EXISTS로 멱등 처리해 실제로 존재하면 아무 영향 없다.

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS privacy_consent_agreed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent_agreed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;
