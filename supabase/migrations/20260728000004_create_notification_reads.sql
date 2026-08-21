-- 브로드캐스트(user_id IS NULL) 알림의 사용자별 읽음 여부를 저장하는 테이블
-- 기존 notifications.is_read는 회사 전체가 공유하는 단일 컬럼이라, 회사 공지성 알림을
-- 팀원 중 한 명이 열람하면 다른 모든 팀원에게도 읽음 처리가 되어버리는 문제가 있었다.
-- user_id가 지정된 개인 알림(예: 기술지원 답변)은 기존 notifications.is_read 방식을
-- 그대로 유지하고, user_id가 NULL인 공지성 알림만 이 테이블로 사용자별 읽음 영수증을
-- 관리한다.

CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- 본인의 읽음 영수증만, 그리고 본인 회사의 알림에 대한 것만 조회/생성/삭제 가능
DROP POLICY IF EXISTS "Users can view their own read receipts" ON notification_reads;
CREATE POLICY "Users can view their own read receipts"
  ON notification_reads
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_reads.notification_id
        AND notifications.company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert their own read receipts" ON notification_reads;
CREATE POLICY "Users can insert their own read receipts"
  ON notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_reads.notification_id
        AND notifications.company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own read receipts" ON notification_reads;
CREATE POLICY "Users can delete their own read receipts"
  ON notification_reads
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_reads.notification_id
        AND notifications.company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
    )
  );

COMMENT ON TABLE notification_reads IS '회사 전체 공지(broadcast, notifications.user_id IS NULL) 알림에 대한 사용자별 읽음 영수증';
