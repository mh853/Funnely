-- company_subscriptions에 대한 클라이언트(세션) 쓰기 권한 제거 - 쓰기는 서비스 롤(API·엣지함수·크론)만 (노션 36번)
-- Created: 2026-09-09
--
-- 기존 company_subscriptions_admin 정책이 FOR ALL(WITH CHECK 없음)이라 회사 owner/admin이
-- Supabase REST로 자기 회사 구독 행을 status=active·plan_id=프리미엄·current_period_end=2099
-- 등으로 직접 UPDATE/INSERT 할 수 있었다(결제 없이 유료 플랜 이용 가능). 이 정책에
-- 의존하던 클라이언트 쓰기(NewSubscriptionClient/PlanSetupClient)와 세션 클라이언트 API
-- (cancel/reactivate/cancel-pending-change/rollback-plan-change/user-account)는 모두
-- 서버(서비스 롤) 경로로 옮겼다 - 이 마이그레이션은 그 코드가 배포된 뒤에 적용할 것.
--
-- SELECT는 company_subscriptions_select_members(회사 구성원 전원)가 그대로 담당하므로
-- 별도 SELECT 정책을 추가하지 않는다.

DROP POLICY IF EXISTS company_subscriptions_admin ON company_subscriptions;
