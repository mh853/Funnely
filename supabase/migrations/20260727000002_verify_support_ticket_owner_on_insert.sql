-- support_tickets/support_ticket_messages의 INSERT 정책이 "같은 회사 소속"만
-- 확인하고, 실제로 삽입되는 행의 created_by_user_id/user_id가 호출자 자신인지는
-- 검증하지 않았다. 애플리케이션 코드(api/support/tickets/**)는 항상 서버 세션의
-- user.id를 쓰므로 정상 경로로는 문제가 없지만, 같은 회사 소속 인증 사용자가
-- PostgREST를 직접 호출해 임의의(같은 회사) user_id로 티켓/메시지를 위장 생성할
-- 수 있는 방어 계층 공백이 있었다. 20260311000001에서 회사 소속 검증까지는
-- 이미 추가했으므로, 여기서는 작성자 본인 검증만 추가한다.

DROP POLICY IF EXISTS "Users can create tickets for their company" ON public.support_tickets;
CREATE POLICY "Users can create tickets for their company"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    AND created_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can create ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Authenticated users can create ticket messages"
  ON public.support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE company_id = (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
    AND user_id = auth.uid()
  );
