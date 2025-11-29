-- Add external form fields configuration column to landing_pages table
-- Created: 2025-01-30

-- Add external_form_fields column to landing_pages
ALTER TABLE landing_pages
ADD COLUMN external_form_fields JSONB DEFAULT '{
  "includeEmail": true,
  "includeAddress": true,
  "includeBirthDate": false,
  "includeGender": false,
  "includeConsultationType": false,
  "consultationTypes": ["일반 상담", "전문 상담", "긴급 상담"]
}';

COMMENT ON COLUMN landing_pages.external_form_fields IS '외부 수집 페이지 추가 입력 필드 설정 (JSON)';
