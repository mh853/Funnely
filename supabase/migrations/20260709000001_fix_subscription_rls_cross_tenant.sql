-- Migration: Fix cross-tenant RLS exposure on company_subscriptions and subscription_plans
-- Description: 20251213000012_create_subscription_tables.sql가 company_subscriptions_admin
-- 정책을 company_id 스코핑 없이 만들어서, 아무 회사의 company_owner/company_admin이든
-- 다른 모든 회사의 구독 데이터(billing_key, customer_key, card_info 포함)를
-- 읽고 쓸 수 있는 상태였다. 같은 마이그레이션이 subscription_plans의 공개 SELECT
-- 정책도 삭제해서, company_owner/company_admin이 아닌 일반 직원에게는 구독 페이지의
-- 요금제 목록이 항상 비어 보였다. 원래(20250131010000_create_subscription_system.sql)
-- 있던 회사 스코핑 방식으로 복구한다.
-- Created: 2026-07-09

DROP POLICY IF EXISTS company_subscriptions_admin ON company_subscriptions;

CREATE POLICY company_subscriptions_admin ON company_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
      AND users.company_id = company_subscriptions.company_id
    )
  );

-- subscription_plans는 요금제 카탈로그로, 모든 인증된 사용자가 조회할 수 있어야
-- 구독 페이지가 정상 렌더링된다 (쓰기는 계속 subscription_plans_admin이 관리자로 제한).
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);
