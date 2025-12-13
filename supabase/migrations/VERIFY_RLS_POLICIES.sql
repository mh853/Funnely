-- RLS 정책 확인용 SQL
-- Supabase SQL Editor에서 실행하여 현재 RLS 정책 상태 확인

-- 1. privacy_policies 테이블의 모든 RLS 정책 조회
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'privacy_policies'
ORDER BY policyname;

-- 2. RLS가 활성화되어 있는지 확인
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'privacy_policies';

-- 3. 현재 사용자로 privacy_policies 조회 테스트
-- (이 쿼리가 성공하면 RLS가 제대로 작동하는 것)
SELECT
  id,
  company_id,
  privacy_consent_title,
  marketing_consent_title,
  created_at
FROM privacy_policies
LIMIT 1;
