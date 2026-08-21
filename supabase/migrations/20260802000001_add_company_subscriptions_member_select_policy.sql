-- company_subscriptions에는 company_subscriptions_admin(FOR ALL, admin/owner 전용)
-- 정책 하나만 있고 일반 직원(manager/user)용 SELECT 정책이 없다. 20251213000012의
-- DROP TABLE CASCADE로 원래(20250131010000) 있던 "회사 소속이면 누구나 SELECT"
-- 정책이 사라진 뒤, 이후 두 차례(20260709000001, 20260729000001) 수정 모두
-- company_subscriptions_admin만 갱신했을 뿐 이 SELECT 정책은 복구되지 않았다.
--
-- 그 결과 middleware.ts의 구독 만료 차단 로직이 세션 스코프 클라이언트로 이 테이블을
-- 조회할 때 manager/user 역할 계정은 항상 빈 배열을 받아 만료 판정 자체가 스킵되고,
-- 만료/정지된 회사라도 관리자가 아닌 직원은 대시보드에 무기한 접근할 수 있었다
-- (58차 QA 확인, Critical). /dashboard/payments 페이지도 동일하게 영향받았다.
--
-- 20260709000001의 실수(FOR ALL을 company_id 스코프 없이 만들어 크로스테넌트
-- 유출을 냈던 사고)를 반복하지 않도록, 이번엔 반드시 SELECT 전용 + company_id
-- 스코프로만 추가한다. 쓰기(INSERT/UPDATE/DELETE)는 계속 company_subscriptions_admin이
-- 관리자로만 제한한다 - 이 정책은 SELECT 권한만 넓힌다.
DROP POLICY IF EXISTS company_subscriptions_select_members ON company_subscriptions;

CREATE POLICY company_subscriptions_select_members ON company_subscriptions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
