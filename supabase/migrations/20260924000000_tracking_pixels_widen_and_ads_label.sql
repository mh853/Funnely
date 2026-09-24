-- 추적 픽셀 컬럼을 검증 규칙(64자 화이트리스트)과 맞추고 구글 애즈 전환 라벨 컬럼을 추가
--
-- 1) facebook/ga/google_ads/kakao/naver 컬럼이 varchar(20)이라 입력칸 maxLength도 20에
--    묶여 있었고, 퍼널리 GA4 칸에 붙여넣은 `AW-771534388/csgwCLL...`이 20자에서 잘린 채
--    저장됐다. 렌더/저장 쪽 검증(isValidPixelId)은 64자까지 허용하므로 컬럼을 맞춘다.
-- 2) 구글 애즈 전환은 send_to에 `AW-ID/라벨`이 있어야 집계되는데 라벨을 저장할 곳이
--    없었다 - 별도 컬럼으로 추가한다.
-- 3) GA4 칸에 들어간 구글 애즈 값(`AW-`로 시작)은 렌더에서 걸러져 아무 효과가 없고,
--    저장 버튼이 이 칸 검증에 걸려 다른 픽셀까지 수정할 수 없게 만들고 있었다.
--    ID 부분만 google_ads_id로 옮기고 GA4 칸은 비운다(라벨은 잘려 있어 옮기지 않음).
-- 4) 형식 CHECK 제약 - 잘못된 값이 저장돼 설정 화면 저장이 통째로 막히는 상황이
--    어떤 경로(직접 API 호출 포함)로도 다시 생기지 않도록 DB에서도 막는다.
-- (2026-09-24 SQL 에디터로 라이브에 먼저 적용됨)

ALTER TABLE tracking_pixels
  ALTER COLUMN facebook_pixel_id TYPE varchar(64),
  ALTER COLUMN google_analytics_id TYPE varchar(64),
  ALTER COLUMN google_ads_id TYPE varchar(64),
  ALTER COLUMN kakao_pixel_id TYPE varchar(64),
  ALTER COLUMN naver_pixel_id TYPE varchar(64);

ALTER TABLE tracking_pixels
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label varchar(64);

UPDATE tracking_pixels
SET
  google_ads_id = COALESCE(google_ads_id, split_part(google_analytics_id, '/', 1)),
  google_analytics_id = NULL
WHERE google_analytics_id ILIKE 'AW-%';

ALTER TABLE tracking_pixels
  ADD CONSTRAINT tracking_pixels_id_format_check CHECK (
    (facebook_pixel_id IS NULL OR facebook_pixel_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (google_analytics_id IS NULL OR google_analytics_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (google_ads_id IS NULL OR google_ads_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (google_ads_conversion_label IS NULL OR google_ads_conversion_label ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (kakao_pixel_id IS NULL OR kakao_pixel_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (naver_pixel_id IS NULL OR naver_pixel_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (tiktok_pixel_id IS NULL OR tiktok_pixel_id ~ '^[A-Za-z0-9_-]{1,64}$')
    AND (karrot_pixel_id IS NULL OR karrot_pixel_id ~ '^[A-Za-z0-9_-]{1,64}$')
  );
