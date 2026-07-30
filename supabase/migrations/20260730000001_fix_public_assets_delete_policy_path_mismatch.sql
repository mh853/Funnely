-- public-assets 버킷의 DELETE 정책이 auth.uid()::text = (storage.foldername(name))[1]
-- 를 요구하지만, 실제 업로드 경로는 landing-pages/{companyId}/{fileName}
-- (LandingPageNewForm.tsx handleFileUpload) 형태라 foldername(name)[1]은 항상
-- 리터럴 문자열 'landing-pages'이고 어떤 auth.uid()와도 절대 일치하지 않는다.
-- 그 결과 인증된 사용자가 storage.remove()를 호출해도 에러 없이 0건 삭제로
-- 조용히 무시되어(RLS가 행을 필터링) orphan 파일이 영구적으로 누적된다.
-- (실측: 테스트 계정으로 업로드 → 인증 세션으로 remove() 호출 → 파일이
-- 그대로 남아있음을 확인)
--
-- landing-page-images 버킷의 completion-backgrounds 정책과 동일하게, uid
-- 매칭 대신 실제 폴더 구조(첫 세그먼트 'landing-pages')를 확인하고 인증
-- 여부만 검사하도록 맞춘다.

DROP POLICY IF EXISTS "Users can delete own uploads in public-assets" ON storage.objects;

CREATE POLICY "Users can delete own uploads in public-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] = 'landing-pages'
  AND auth.uid() IS NOT NULL
);
