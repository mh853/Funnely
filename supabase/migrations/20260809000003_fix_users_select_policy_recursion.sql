-- 직전 마이그레이션(20260809000002)이 users_select_same_company 정책에 users 테이블을
-- 다시 조회하는 EXISTS 서브쿼리를 추가했는데, 정책이 걸린 테이블 자기 자신을 다시
-- 조회하는 서브쿼리는 Postgres RLS 평가기가 정책을 재적용하려다 순환을 감지해
-- "infinite recursion detected in policy for relation users"(42P17)로 즉시 실패한다
-- (74차 QA, 적용 직후 실제 세션으로 라이브검증 중 발견). 같은 파일의 get_my_company_id()
-- 등 다른 헬퍼 함수들이 이미 SECURITY DEFINER로 이 문제를 피하고 있던 것과 동일한
-- 패턴을 써야 한다 - 함수 내부 쿼리는 RLS를 우회해 재귀 없이 한 번에 resolve된다.
CREATE OR REPLACE FUNCTION am_i_active_in_active_company()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND c.is_active = true
      AND c.withdrawn_at IS NULL
  )
$$;

DROP POLICY "users_select_same_company" ON "users";
CREATE POLICY "users_select_same_company" ON "users"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (
    (company_id = get_my_company_id())
    AND am_i_active_in_active_company()
  );
