-- "Service role can insert notifications" 정책은 이름과 달리 실제로는
-- WITH CHECK (true)에 TO service_role 제한도 없어 인증된 일반 사용자
-- 누구나 company_id를 자기 회사가 아닌 임의 값으로 지정해 다른 회사의
-- 알림함에 조작된 알림(피싱성 문구 등)을 실시간으로 삽입할 수 있었다
-- (68차 QA 확인). service_role 커넥션은 RLS 자체를 우회하므로 cron/
-- admin 라우트(전부 service role 사용)는 이 정책과 무관하게 계속
-- 동작한다 - 세션 스코프 클라이언트로 알림을 남기는 두 라우트
-- (leads/distribute, leads/update)는 항상 "자기 회사"에만 삽입하므로
-- 아래 제약으로도 회귀 없이 계속 동작한다.

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Users can insert their own company notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );
