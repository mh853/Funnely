-- support_tickets에 일반(비-슈퍼어드민) 사용자를 위한 UPDATE RLS 정책이 애초에 없었다
-- (SELECT/INSERT 정책만 존재, UPDATE는 "Super admins can manage all"뿐). 그 결과
-- PATCH /api/support/tickets/[id]의 첨부파일 수정이 티켓 생성자 본인이어도 RLS가
-- 조용히 0건 갱신으로 막아 항상 무효였다(에러 없이 "성공"처럼 보이지만 실제로는
-- 아무것도 안 바뀜 - 48차 QA에서 라이브로 재현 확인). 같은 회사 범위로 UPDATE를 허용한다.

DROP POLICY IF EXISTS "Users can update their company tickets" ON support_tickets;
CREATE POLICY "Users can update their company tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );
