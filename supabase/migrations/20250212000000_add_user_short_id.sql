-- ============================================================================
-- User Short ID for Landing Page Referral Links
-- Created: 2025-02-12
-- Description: 사용자별 짧은 ID 추가 (랜딩페이지 ref 파라미터용)
-- ============================================================================

-- ============================================================================
-- STEP 1: short_id 컬럼 추가
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;

-- ============================================================================
-- STEP 2: 짧은 ID 생성 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_short_id(length INT DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: 기존 사용자에게 short_id 부여
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT;
BEGIN
  FOR user_record IN SELECT id FROM users WHERE short_id IS NULL LOOP
    attempt := 0;
    LOOP
      new_short_id := generate_short_id(6);
      BEGIN
        UPDATE users SET short_id = new_short_id WHERE id = user_record.id;
        EXIT; -- 성공하면 루프 탈출
      EXCEPTION WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 4: 새 사용자 생성 시 자동으로 short_id 부여하는 트리거
-- ============================================================================

CREATE OR REPLACE FUNCTION set_user_short_id()
RETURNS TRIGGER AS $$
DECLARE
  new_short_id TEXT;
  max_attempts INT := 100;
  attempt INT := 0;
BEGIN
  IF NEW.short_id IS NULL THEN
    LOOP
      new_short_id := generate_short_id(6);
      -- 중복 체크
      IF NOT EXISTS (SELECT 1 FROM users WHERE short_id = new_short_id) THEN
        NEW.short_id := new_short_id;
        EXIT;
      END IF;
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique short_id after % attempts', max_attempts;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있으면 삭제
DROP TRIGGER IF EXISTS trigger_set_user_short_id ON users;

-- 트리거 생성
CREATE TRIGGER trigger_set_user_short_id
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_user_short_id();

-- ============================================================================
-- STEP 5: 인덱스 생성
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_short_id ON users(short_id);

-- ============================================================================
-- STEP 6: 코멘트 추가
-- ============================================================================

COMMENT ON COLUMN users.short_id IS '사용자 짧은 ID (랜딩페이지 ref 파라미터용, 예: u7k2m9)';
