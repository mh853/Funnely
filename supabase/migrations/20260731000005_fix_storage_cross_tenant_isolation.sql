-- 48차 QA에서 라이브로 재현 확인된 크로스테넌트 스토리지 취약점 3건 수정.
-- 업로드 경로는 항상 "{prefix}/{companyId}/{fileName}" 형태이고 companyId는
-- 서버가 조회한 본인의 users.company_id를 그대로 넘기는 값(클라이언트가 임의로
-- 바꿀 수 없음)인데, 지금까지의 정책은 첫 세그먼트(리터럴 prefix)나 인증 여부만
-- 확인하고 두 번째 세그먼트(실제 companyId)는 전혀 검증하지 않았다:
--   1) public-assets INSERT: 경로 검증 자체가 없어 인증만 되면 아무 회사 폴더에나 업로드 가능
--   2) public-assets DELETE: (storage.foldername(name))[1]='landing-pages'만 확인해
--      아무 회사나 다른 회사 이미지를 실제로 삭제 가능 (라이브 재현 확인)
--   3) landing-page-images DELETE: completion-backgrounds도 동일한 결함 (라이브 재현 확인)
-- 두 번째 세그먼트를 auth.uid()의 실제 소속 회사와 비교하도록 전부 고친다.
-- INSERT 쪽도 동일 원칙으로 함께 강화(landing-page-images INSERT는 기존에 크로스테넌트
-- 업로드까지는 안 됐지만 일관성을 위해 같은 검증을 추가).

-- public-assets: 실사용 경로가 canvas로 항상 image/jpeg로 재인코딩 후 업로드되는데
-- 버킷은 gif/png/webp/svg+xml까지 허용해 불필요하게 넓은 공격표면(특히 svg+xml의
-- 스크립트 삽입 위험)이었다 - 실제 쓰이는 형식으로 좁힌다.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'public-assets';

DROP POLICY IF EXISTS "Authenticated users can upload to public-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'landing-pages'
  AND (storage.foldername(name))[2] = (SELECT company_id::text FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own uploads in public-assets" ON storage.objects;
CREATE POLICY "Users can delete own uploads in public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'landing-pages'
  AND (storage.foldername(name))[2] = (SELECT company_id::text FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Allow authenticated users to upload landing page images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload landing page images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
  AND (storage.foldername(name))[2] = (SELECT company_id::text FROM users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Allow users to delete their company's landing page images" ON storage.objects;
CREATE POLICY "Allow users to delete their company's landing page images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'landing-page-images'
  AND (storage.foldername(name))[1] = 'completion-backgrounds'
  AND (storage.foldername(name))[2] = (SELECT company_id::text FROM users WHERE id = auth.uid())
);
