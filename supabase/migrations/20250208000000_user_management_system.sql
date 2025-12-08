-- ============================================================================
-- 사용자 관리 시스템 - 권한 체계 및 초대 시스템
-- Created: 2025-02-08
-- Description: 3단계 권한 체계 (admin, manager, user), 초대 링크 시스템, 자동 배정 기능
-- ============================================================================

-- ============================================================================
-- STEP 1: ENUMS (새로운 간단한 역할 체계)
-- ============================================================================

-- 새로운 간단한 역할 enum 생성
DO $$ BEGIN
  CREATE TYPE simple_user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 초대 상태 enum
DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: ALTER USERS TABLE (새 역할 컬럼 추가)
-- ============================================================================

-- users 테이블에 새로운 역할 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS simple_role simple_user_role DEFAULT 'user';

-- 기존 역할을 새 역할로 매핑
UPDATE users SET simple_role = 'admin' WHERE role IN ('hospital_owner', 'hospital_admin');
UPDATE users SET simple_role = 'manager' WHERE role = 'marketing_manager';
UPDATE users SET simple_role = 'user' WHERE role IN ('marketing_staff', 'viewer') OR simple_role IS NULL;

-- ============================================================================
-- STEP 3: COMPANY INVITATIONS TABLE (초대 시스템)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 초대 정보
  invitation_code TEXT UNIQUE NOT NULL,
  email TEXT, -- 선택적: 이메일로 초대할 경우
  role simple_user_role NOT NULL DEFAULT 'user',

  -- 상태 관리
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,

  -- 수락 정보
  accepted_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_company_invitations_company_id ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_code ON company_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_company_invitations_status ON company_invitations(status);
CREATE INDEX IF NOT EXISTS idx_company_invitations_expires_at ON company_invitations(expires_at);

COMMENT ON TABLE company_invitations IS '회사 팀원 초대 링크';

-- ============================================================================
-- STEP 4: ALTER LEADS TABLE (담당자 컬럼 추가)
-- ============================================================================

-- 콜 담당자 (자동 배정)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_assigned_to UUID REFERENCES users(id);

-- 상담 담당자 (수동 배정)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS counselor_assigned_to UUID REFERENCES users(id);

-- 유입 경로 추적 (랜딩페이지 ref 파라미터)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES users(id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_leads_call_assigned_to ON leads(call_assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_counselor_assigned_to ON leads(counselor_assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_referrer_user_id ON leads(referrer_user_id);

-- ============================================================================
-- STEP 5: ALTER CALENDAR_EVENTS TABLE (상담 담당자 컬럼 추가)
-- ============================================================================

-- 상담 담당자 (예약에서 지정)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS counselor_id UUID REFERENCES users(id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_calendar_events_counselor_id ON calendar_events(counselor_id);

-- ============================================================================
-- STEP 6: AUTO ASSIGN FUNCTION (콜 담당자 자동 배정 - Round Robin)
-- ============================================================================

-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS auto_assign_call_staff(UUID);

CREATE OR REPLACE FUNCTION auto_assign_call_staff(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assigned_user_id UUID;
BEGIN
  -- Round Robin 방식: 현재 활성 리드가 가장 적은 'user' 역할 담당자 선택
  SELECT u.id INTO v_assigned_user_id
  FROM users u
  LEFT JOIN (
    SELECT call_assigned_to, COUNT(*) as lead_count
    FROM leads
    WHERE status NOT IN ('completed', 'cancelled', 'contract_completed')
      AND call_assigned_to IS NOT NULL
    GROUP BY call_assigned_to
  ) l ON u.id = l.call_assigned_to
  WHERE u.company_id = p_company_id
    AND u.simple_role = 'user'  -- 'user' 역할만 대상
    AND u.is_active = TRUE
  ORDER BY COALESCE(l.lead_count, 0) ASC, u.created_at ASC  -- 리드 수가 같으면 먼저 가입한 순
  LIMIT 1;

  RETURN v_assigned_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_assign_call_staff(UUID) IS '새 리드에 콜 담당자 자동 배정 (Round Robin, user 역할만 대상)';

-- ============================================================================
-- STEP 7: TRIGGER FOR AUTO ASSIGNMENT (리드 생성 시 자동 배정)
-- ============================================================================

-- 리드 생성 시 콜 담당자 자동 배정 트리거 함수
CREATE OR REPLACE FUNCTION trigger_auto_assign_call_staff()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_assigned_user_id UUID;
BEGIN
  -- leads 테이블에서 company_id 가져오기 (hospital_id가 company_id로 변경됨)
  -- leads 테이블은 hospital_id를 사용하고 있음
  v_company_id := NEW.hospital_id;

  -- call_assigned_to가 이미 설정되어 있지 않은 경우에만 자동 배정
  IF NEW.call_assigned_to IS NULL THEN
    v_assigned_user_id := auto_assign_call_staff(v_company_id);

    IF v_assigned_user_id IS NOT NULL THEN
      NEW.call_assigned_to := v_assigned_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_leads_auto_assign ON leads;

CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();

-- ============================================================================
-- STEP 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- company_invitations 테이블 RLS 활성화
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- 초대 목록 조회 (같은 회사 관리자만)
DO $$ BEGIN
  CREATE POLICY "Admins can view company invitations"
    ON company_invitations FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND simple_role IN ('admin', 'manager')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 초대 생성 (관리자만)
DO $$ BEGIN
  CREATE POLICY "Admins can create invitations"
    ON company_invitations FOR INSERT
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND simple_role = 'admin'
      )
      AND invited_by = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 초대 업데이트 (관리자만)
DO $$ BEGIN
  CREATE POLICY "Admins can update invitations"
    ON company_invitations FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND simple_role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 초대 삭제 (관리자만)
DO $$ BEGIN
  CREATE POLICY "Admins can delete invitations"
    ON company_invitations FOR DELETE
    USING (
      company_id IN (
        SELECT company_id FROM users
        WHERE id = auth.uid()
        AND simple_role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 초대 코드로 조회 (공개 - 초대 수락용)
DO $$ BEGIN
  CREATE POLICY "Anyone can view invitation by code"
    ON company_invitations FOR SELECT
    USING (TRUE);  -- 코드 자체가 인증 역할을 함
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 9: HELPER FUNCTIONS
-- ============================================================================

-- 초대 링크 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- 랜덤 코드 생성 (16자 영숫자)
    v_code := encode(gen_random_bytes(12), 'base64');
    v_code := replace(replace(replace(v_code, '+', ''), '/', ''), '=', '');
    v_code := substr(v_code, 1, 16);

    -- 중복 체크
    SELECT EXISTS(
      SELECT 1 FROM company_invitations WHERE invitation_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_invitation_code() IS '유니크한 초대 코드 생성 (16자)';

-- 만료된 초대 정리 함수 (스케줄러나 수동 실행)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE company_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_invitations() IS '만료된 초대 상태 업데이트';

-- ============================================================================
-- STEP 10: TRIGGERS FOR updated_at
-- ============================================================================

DO $$ BEGIN
  CREATE TRIGGER update_company_invitations_updated_at
    BEFORE UPDATE ON company_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.simple_role IS '간단한 3단계 권한: admin(관리자), manager(매니저), user(일반사용자)';
COMMENT ON COLUMN leads.call_assigned_to IS '콜 담당자 (자동 배정)';
COMMENT ON COLUMN leads.counselor_assigned_to IS '상담 담당자 (수동 배정)';
COMMENT ON COLUMN leads.referrer_user_id IS '유입 경로 추적 (ref 파라미터로 전달된 사용자 ID)';
COMMENT ON COLUMN calendar_events.counselor_id IS '상담 담당자';
