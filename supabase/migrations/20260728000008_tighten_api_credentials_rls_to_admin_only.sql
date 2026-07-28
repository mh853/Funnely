-- api_credentials RLS가 앱 레벨 의도(회사 관리자 전용, api-credentials/route.ts의
-- GET/PUT 권한 체크)보다 훨씬 넓었다:
-- - SELECT 정책은 role 제한이 전혀 없어 같은 회사의 아무 구성원이나(viewer 포함)
--   Supabase REST 엔드포인트를 자기 세션으로 직접 호출해 저장된 값을 읽을 수 있었음
-- - INSERT/UPDATE 정책은 marketing_manager까지 포함하고 있어, 앱의 PUT 라우트는
--   막고 있는데도 marketing_manager 계정이 REST를 직접 호출하면 우회해서 광고
--   플랫폼 자격증명을 쓸 수 있었음(암호화는 앱 코드에서만 수행되므로 이 경로로
--   들어가면 암호화 없이 저장될 위험도 있음)
-- 앱 라우트와 동일한 기준(레거시 role 4종 + simple_role='admin' 폴백, manager 제외)으로
-- SELECT/INSERT/UPDATE를 전부 맞춘다. DELETE는 앱에 호출부가 없어 이번엔 손대지 않음.

DROP POLICY IF EXISTS "Users can view own company credentials" ON api_credentials;
CREATE POLICY "Users can view own company credentials"
  ON api_credentials
  FOR SELECT
  USING (
    company_id IN (
      SELECT users.company_id FROM users
      WHERE users.id = auth.uid()
        AND (
          users.simple_role = 'admin'
          OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );

DROP POLICY IF EXISTS "Company owners and admins can insert credentials" ON api_credentials;
CREATE POLICY "Company owners and admins can insert credentials"
  ON api_credentials
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT users.company_id FROM users
      WHERE users.id = auth.uid()
        AND (
          users.simple_role = 'admin'
          OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );

DROP POLICY IF EXISTS "Company owners and admins can update credentials" ON api_credentials;
CREATE POLICY "Company owners and admins can update credentials"
  ON api_credentials
  FOR UPDATE
  USING (
    company_id IN (
      SELECT users.company_id FROM users
      WHERE users.id = auth.uid()
        AND (
          users.simple_role = 'admin'
          OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );
