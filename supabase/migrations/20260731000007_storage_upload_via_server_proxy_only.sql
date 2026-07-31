-- 48차 QA: Storage의 allowed_mime_types는 클라이언트가 선언한 Content-Type만 확인하고
-- 실제 파일 바이트는 검사하지 않아, HTML/스크립트를 image/jpeg로 위장 업로드하면 그대로
-- 공개 서빙됨을 라이브로 확인했다. landing-page-images는 public-assets와 동일하게
-- 클라이언트가 canvas로 항상 image/jpeg로 재압축 후 업로드하므로(compressImage),
-- 실제 쓰이는 형식으로 좁힌다. (이 UPDATE는 지금 배포된 프론트엔드와도 호환되어
-- 즉시 적용해도 안전함 - authenticated 직접업로드를 막는 DROP POLICY는 새 서버
-- 프록시 코드가 배포된 뒤에 별도 마이그레이션으로 적용한다.)

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'landing-page-images';
