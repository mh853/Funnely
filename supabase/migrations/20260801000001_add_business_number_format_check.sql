-- companies.business_number에 형식 검증이 클라이언트/서버/DB 전 계층에 전혀
-- 없어 임의 문자열이 그대로 저장되고 있었다(51차 QA 라이브 확인 - 'abc', 숫자
-- 하나, 30자 초과 문자열, 스크립트 태그 등도 전부 에러 없이 저장됨). 클라이언트
-- 검증(CompanySettingsForm.tsx)을 추가한 것과 별개로, 직접 API 호출 등 클라이언트를
-- 우회하는 경로에 대비해 DB 레벨에도 형식 제약을 건다. 가입 시 임시값(TEMP-{timestamp}-...)과
-- NULL은 그대로 허용해야 한다.
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_business_number_format_check;

ALTER TABLE companies
  ADD CONSTRAINT companies_business_number_format_check
  CHECK (
    business_number IS NULL
    OR business_number ~ '^\d{3}-\d{2}-\d{5}$'
    OR business_number LIKE 'TEMP-%'
  );
