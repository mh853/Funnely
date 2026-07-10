-- Migration: Add missing DELETE policy on lead_notes
-- Description: lead_notes에는 SELECT/INSERT 정책만 있고 DELETE 정책이 없어서,
-- DELETE /api/leads/notes가 애플리케이션 레벨 소유권 체크를 통과해도 RLS가 조용히
-- 0건 삭제로 막아버렸다. 사용자에게는 "삭제 완료"로 보이지만 실제로는 메모가 그대로
-- 남아있었다. 같은 회사 소속이면 삭제할 수 있도록, 기존 SELECT 정책과 동일한
-- company 스코핑으로 DELETE 정책을 추가한다 (route.ts의 애플리케이션 레벨 체크와도 일치).
-- Created: 2026-07-09

CREATE POLICY "Users can delete notes for leads in their company"
  ON lead_notes FOR DELETE
  USING (
    lead_id IN (
      SELECT leads.id FROM leads
      WHERE leads.company_id IN (
        SELECT users.company_id FROM users WHERE users.id = auth.uid()
      )
    )
  );
