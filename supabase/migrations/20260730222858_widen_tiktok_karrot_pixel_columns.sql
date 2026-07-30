-- tracking_pixels.tiktok_pixel_id / karrot_pixel_id가 VARCHAR(20)으로 생성되어
-- 있는데(20251213000000_add_tiktok_karrot_pixels.sql), 클라이언트 검증
-- isValidPixelId(src/lib/utils/tracking-pixels.ts)는 1~64자를 유효한 형식으로
-- 허용하고 입력창 maxLength도 30이다. 그 결과 21~30자 정상 형식 값을 입력하면
-- 클라이언트 검증은 통과하지만 저장 시 Postgres가 "value too long for type
-- character varying(20)" 400 에러를 내고, 이게 일반 오류 토스트로만 떠서
-- 사용자는 원인을 알 수 없다(42차 QA에서 라이브 재현 확인). 컬럼 폭을
-- isValidPixelId의 64자 상한에 맞춰 VARCHAR(64)로 넓혀 클라이언트 검증을
-- 통과한 값은 항상 저장도 성공하도록 한다.
ALTER TABLE tracking_pixels
  ALTER COLUMN tiktok_pixel_id TYPE VARCHAR(64),
  ALTER COLUMN karrot_pixel_id TYPE VARCHAR(64);
