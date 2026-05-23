-- phone_blacklist를 전역 테이블에서 회사별 테이블로 전환
-- 기존 super_admin 전용 RLS를 company 멤버 접근으로 변경

-- 1. company_id 컬럼 추가
ALTER TABLE phone_blacklist
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. 기존 데이터에 임시 company_id 부여 (blocked_by_user_id 기준)
UPDATE phone_blacklist pb
SET company_id = u.company_id
FROM users u
WHERE pb.blocked_by_user_id = u.id
  AND pb.company_id IS NULL;

-- 3. NOT NULL 제약 추가 (기존 데이터 정리 후)
ALTER TABLE phone_blacklist
  ALTER COLUMN company_id SET NOT NULL;

-- 4. phone_number UNIQUE → (company_id, phone_number) UNIQUE로 변경
--    같은 번호를 다른 회사가 각자 차단할 수 있어야 함
ALTER TABLE phone_blacklist DROP CONSTRAINT IF EXISTS phone_blacklist_phone_number_key;
ALTER TABLE phone_blacklist
  ADD CONSTRAINT phone_blacklist_company_phone_unique UNIQUE (company_id, phone_number);

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_phone_blacklist_company_id ON phone_blacklist(company_id);

-- 6. 기존 super_admin 전용 RLS 정책 삭제
DROP POLICY IF EXISTS "Admins can view phone blacklist" ON phone_blacklist;
DROP POLICY IF EXISTS "Admins can insert phone blacklist" ON phone_blacklist;
DROP POLICY IF EXISTS "Admins can delete phone blacklist" ON phone_blacklist;

-- 7. 회사 멤버 접근 RLS 정책 추가
CREATE POLICY "Company members can view their blacklist"
  ON phone_blacklist FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company members can insert blacklist"
  ON phone_blacklist FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true)
  );

CREATE POLICY "Company members can delete their blacklist"
  ON phone_blacklist FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND is_active = true
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_super_admin = true)
  );

-- 8. service_role 접근 허용
CREATE POLICY "Service role full access to blacklist"
  ON phone_blacklist FOR ALL TO service_role
  USING (true) WITH CHECK (true);
