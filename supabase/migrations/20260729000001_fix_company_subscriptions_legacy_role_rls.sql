-- company_subscriptions_admin(FOR ALL) 정책이 users.role IN ('company_owner',
-- 'company_admin')만 확인하고 simple_role='admin' 폴백과 레거시 role
-- (hospital_owner/hospital_admin)을 빠뜨리고 있다. 이번 세션에서 companies/
-- company_invitations/calendar_events/payment_audit_logs/api_credentials/
-- sheet_sync_configs 등 6개 테이블에서 반복 발견·수정된 것과 정확히 같은
-- 누락으로, hospital_owner/hospital_admin role 계정과 simple_role='admin'
-- 계정은 자기 회사의 구독 정보(billing_key, customer_key, card_info 포함)를
-- 하나도 조회/수정하지 못하는 상태였다. 이 세션에서 써온 표준 패턴(레거시
-- role 4종 + simple_role='admin' 폴백)으로 맞춘다.

DROP POLICY IF EXISTS company_subscriptions_admin ON company_subscriptions;

CREATE POLICY company_subscriptions_admin ON company_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.simple_role = 'admin'
        OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
      )
      AND users.company_id = company_subscriptions.company_id
    )
  );
