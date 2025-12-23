-- DB 블랙리스트 테이블 생성
-- 랜딩페이지에서 악의적으로 반복 제출하는 전화번호 차단

CREATE TABLE IF NOT EXISTS phone_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_phone_blacklist_phone ON phone_blacklist(phone_number);
CREATE INDEX idx_phone_blacklist_blocked_at ON phone_blacklist(blocked_at DESC);

-- RLS 정책 설정
ALTER TABLE phone_blacklist ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능
CREATE POLICY "Admins can view phone blacklist"
  ON phone_blacklist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 관리자만 추가 가능
CREATE POLICY "Admins can insert phone blacklist"
  ON phone_blacklist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 관리자만 삭제 가능
CREATE POLICY "Admins can delete phone blacklist"
  ON phone_blacklist
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_phone_blacklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phone_blacklist_updated_at
  BEFORE UPDATE ON phone_blacklist
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_blacklist_updated_at();

-- 코멘트 추가
COMMENT ON TABLE phone_blacklist IS '랜딩페이지 리드 생성을 차단할 전화번호 블랙리스트';
COMMENT ON COLUMN phone_blacklist.phone_number IS '차단할 전화번호 (암호화되지 않은 원본)';
COMMENT ON COLUMN phone_blacklist.reason IS '차단 사유';
COMMENT ON COLUMN phone_blacklist.blocked_by_user_id IS '차단 처리한 관리자 ID';
