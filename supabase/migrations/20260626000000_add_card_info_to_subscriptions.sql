-- 토스 빌링키 발급 시 카드 정보 저장용 컬럼 추가
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS card_info JSONB;

COMMENT ON COLUMN company_subscriptions.card_info IS '토스에서 반환한 카드 정보 (number, cardType, ownerType, issuerCode)';
