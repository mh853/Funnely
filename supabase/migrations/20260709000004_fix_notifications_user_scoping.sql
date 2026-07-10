-- Migration: Fix notifications RLS to respect per-user targeting
-- Description: SELECT/UPDATE 정책이 company_id로만 스코핑되어 있어, user_id가 지정된
-- 개인 알림(예: 특정 사용자에게 온 답변 알림)도 같은 회사의 다른 팀원이 열람하거나
-- 읽음 처리할 수 있었다. user_id가 NULL인 회사 전체 공지는 그대로 전 구성원이
-- 보고 처리할 수 있게 유지하되, user_id가 지정된 개인 알림은 본인만 보고/처리하도록
-- 제한한다.
-- Created: 2026-07-09

DROP POLICY IF EXISTS "Users can view their company notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their company notifications" ON notifications;

CREATE POLICY "Users can view their company notifications"
  ON notifications FOR SELECT
  USING (
    company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Users can update their company notifications"
  ON notifications FOR UPDATE
  USING (
    company_id IN (SELECT users.company_id FROM users WHERE users.id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );
