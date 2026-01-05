-- Lead Notification System
-- 리드 유입 시 이메일 알림을 위한 시스템
-- Created: 2025-01-05

-- 1. companies 테이블에 notification_emails 컬럼 추가
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS notification_emails TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN companies.notification_emails IS '리드 유입 시 알림받을 이메일 주소 목록 (최대 5개)';

-- 2. 알림 큐 테이블 생성
CREATE TABLE IF NOT EXISTS lead_notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_emails TEXT[] NOT NULL,
  lead_data JSONB NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lead_notification_queue IS '리드 알림 전송 큐 - 실패 시 재시도 관리';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lead_notification_queue_sent
  ON lead_notification_queue(sent, created_at);

CREATE INDEX IF NOT EXISTS idx_lead_notification_queue_company_id
  ON lead_notification_queue(company_id);

CREATE INDEX IF NOT EXISTS idx_lead_notification_queue_lead_id
  ON lead_notification_queue(lead_id);

-- 3. 리드 유입 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
DECLARE
  notification_emails TEXT[];
  company_name TEXT;
  landing_page_title TEXT;
BEGIN
  -- Get company notification emails and name
  SELECT c.notification_emails, c.name
  INTO notification_emails, company_name
  FROM companies c
  WHERE c.id = NEW.company_id;

  -- Get landing page title if exists
  IF NEW.landing_page_id IS NOT NULL THEN
    SELECT lp.title
    INTO landing_page_title
    FROM landing_pages lp
    WHERE lp.id = NEW.landing_page_id;
  END IF;

  -- If emails exist, trigger notification
  IF notification_emails IS NOT NULL AND array_length(notification_emails, 1) > 0 THEN
    -- Insert into notification queue
    INSERT INTO lead_notification_queue (
      lead_id,
      company_id,
      recipient_emails,
      lead_data,
      created_at
    ) VALUES (
      NEW.id,
      NEW.company_id,
      notification_emails,
      jsonb_build_object(
        'name', NEW.name,
        'phone', NEW.phone,
        'email', NEW.email,
        'landing_page_id', NEW.landing_page_id,
        'landing_page_title', landing_page_title,
        'company_name', company_name,
        'device_type', NEW.device_type,
        'source', NEW.source,
        'created_at', NEW.created_at
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 트리거 생성 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;

CREATE TRIGGER trigger_notify_new_lead
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION notify_new_lead();

-- 5. RLS 정책 설정 (companies.notification_emails)
-- company_owner와 company_admin만 수정 가능

-- 6. RLS 정책 설정 (lead_notification_queue)
-- 일반 사용자는 접근 불가 (서비스 계정만 접근)
ALTER TABLE lead_notification_queue ENABLE ROW LEVEL SECURITY;

-- Super Admin이 모든 알림 큐 조회 가능 (디버깅용)
CREATE POLICY "Super admins can view all notification queue"
  ON lead_notification_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 7. 이메일 전송 로그 테이블 (선택사항 - 향후 분석용)
CREATE TABLE IF NOT EXISTS lead_notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_queue_id UUID REFERENCES lead_notification_queue(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  email_provider TEXT DEFAULT 'resend'
);

COMMENT ON TABLE lead_notification_logs IS '이메일 전송 이력 - 분석 및 디버깅용';

CREATE INDEX IF NOT EXISTS idx_lead_notification_logs_company_id
  ON lead_notification_logs(company_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_notification_logs_success
  ON lead_notification_logs(success, sent_at DESC);

-- RLS 정책
ALTER TABLE lead_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view notification logs"
  ON lead_notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );
