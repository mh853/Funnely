-- 주의: 이 마이그레이션은 /api/storage/upload 서버 프록시가 실제로 배포된 뒤에만
-- 적용해야 한다. 먼저 적용하면 아직 이전 코드(브라우저 직접 업로드)를 쓰는 배포본이
-- 이미지/첨부파일 업로드에 전부 실패하게 된다.
--
-- 코드 전수 확인 결과 public-assets/landing-page-images/support-attachments 3개
-- 버킷의 유일한 업로드 지점(LandingPageNewForm.tsx 2곳, dashboard/support/page.tsx 1곳)을
-- 전부 서버 프록시(매직넘버 검증 후 서비스 롤로 업로드)로 옮겼으므로, authenticated
-- 세션의 직접 INSERT 경로는 더 이상 필요 없다 - 제거해 우회를 원천 차단한다.

DROP POLICY IF EXISTS "Authenticated users can upload to public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
