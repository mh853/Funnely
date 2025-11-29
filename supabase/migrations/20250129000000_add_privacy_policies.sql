-- Create privacy_policies table for storing consent content
CREATE TABLE privacy_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 개인정보 수집·이용 동의
  privacy_consent_title TEXT DEFAULT '개인정보 수집·이용 동의',
  privacy_consent_content TEXT NOT NULL DEFAULT '1. 수집 항목: 이름, 연락처
2. 수집 목적: 상담 및 서비스 제공
3. 보유 기간: 상담 완료 후 3년
4. 동의 거부 권리: 동의를 거부할 수 있으며, 거부 시 상담 서비스 이용이 제한될 수 있습니다.',

  -- 마케팅 활용 동의
  marketing_consent_title TEXT DEFAULT '마케팅 활용 동의 (선택)',
  marketing_consent_content TEXT NOT NULL DEFAULT '1. 수집 항목: 이름, 연락처
2. 수집 목적: 신규 서비스, 이벤트 안내
3. 보유 기간: 동의 철회 시까지
4. 동의 거부 권리: 동의를 거부할 수 있으며, 거부 시에도 기본 서비스 이용은 가능합니다.',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX idx_privacy_policies_company ON privacy_policies(company_id);

-- RLS 정책 활성화
ALTER TABLE privacy_policies ENABLE ROW LEVEL SECURITY;

-- 조회 권한: 같은 회사 사용자만
CREATE POLICY "Users can view their company's privacy policies"
ON privacy_policies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

-- 수정 권한: 같은 회사 사용자만
CREATE POLICY "Users can update their company's privacy policies"
ON privacy_policies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

-- 생성 권한: 같은 회사 사용자만
CREATE POLICY "Users can insert their company's privacy policies"
ON privacy_policies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.company_id = privacy_policies.company_id
    AND user_profiles.user_id = auth.uid()
  )
);

-- landing_pages 테이블에 동의 관련 컬럼 추가
ALTER TABLE landing_pages
ADD COLUMN require_privacy_consent BOOLEAN DEFAULT true,
ADD COLUMN require_marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN privacy_policy_id UUID REFERENCES privacy_policies(id);

-- leads 테이블에 동의 여부 컬럼 추가
ALTER TABLE leads
ADD COLUMN privacy_consent_agreed BOOLEAN DEFAULT false,
ADD COLUMN marketing_consent_agreed BOOLEAN DEFAULT false,
ADD COLUMN consented_at TIMESTAMPTZ;
