-- =====================================================
-- Support Ticket Replies Table
-- 1:1 문의-답변 시스템 구현
-- =====================================================

-- 공식 답변 테이블 생성
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  reply_message TEXT NOT NULL,
  reply_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 하나의 티켓에 하나의 답변만 허용
  CONSTRAINT unique_ticket_reply UNIQUE(ticket_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id
ON support_ticket_replies(ticket_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_reply_by_user_id
ON support_ticket_replies(reply_by_user_id);

-- RLS 활성화
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS 정책
-- =====================================================

-- Policy: 모든 인증된 사용자가 자신의 회사 티켓에 대한 답변 조회 가능
CREATE POLICY "Users can view replies for their company tickets"
ON support_ticket_replies FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM support_tickets st
    INNER JOIN users u ON u.company_id = st.company_id
    WHERE st.id = support_ticket_replies.ticket_id
      AND u.id = auth.uid()
  )
  OR
  -- Super admins can view all
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- Policy: Super admin만 답변 작성 가능
CREATE POLICY "Super admins can create replies"
ON support_ticket_replies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- Policy: Super admin만 자신의 답변 수정 가능
CREATE POLICY "Super admins can update their replies"
ON support_ticket_replies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- Policy: Super admin만 답변 삭제 가능
CREATE POLICY "Super admins can delete replies"
ON support_ticket_replies FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.is_super_admin = true
  )
);

-- =====================================================
-- Triggers
-- =====================================================

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_support_ticket_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_ticket_replies_timestamp
BEFORE UPDATE ON support_ticket_replies
FOR EACH ROW
EXECUTE FUNCTION update_support_ticket_replies_updated_at();

-- 답변 작성 시 티켓 상태 자동 업데이트
CREATE OR REPLACE FUNCTION update_ticket_status_on_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- 답변이 작성되면 티켓 상태를 'in_progress'로 변경
  UPDATE support_tickets
  SET
    status = CASE
      WHEN status = 'open' THEN 'in_progress'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_on_reply_insert
AFTER INSERT ON support_ticket_replies
FOR EACH ROW
EXECUTE FUNCTION update_ticket_status_on_reply();
