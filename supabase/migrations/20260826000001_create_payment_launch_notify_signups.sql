-- ============================================================================
-- Payment Launch Notify Signups Table
-- Created: 2026-08-26
-- Description: 결제 정식 오픈(토스 승인 완료) 시 알림받기를 신청한 이메일 목록
-- (노션 31번 항목 "홈페이지_결제_릴리즈 전 노티" 후속) - 결제/카드등록 단계
-- 안내 배너에서 수집. admin_digest_sent_at은 daily-tasks 크론이 관리자에게
-- 신규 신청자를 요약메일로 보낼 때, launch_email_sent_at은 실제 정식 오픈 시
-- 어드민이 "전원 발송" 버튼을 눌러 안내 메일을 보낼 때 갱신한다.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_launch_notify_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  admin_digest_sent_at TIMESTAMPTZ,
  launch_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_launch_notify_signups_admin_digest ON payment_launch_notify_signups(admin_digest_sent_at);

ALTER TABLE payment_launch_notify_signups ENABLE ROW LEVEL SECURITY;

-- 정책 없음(서비스 롤 전용) - 신청은 /api/subscription/payment-launch-notify,
-- 조회/발송은 /api/admin/payment-launch-notify가 서비스 롤로만 접근한다.

COMMENT ON TABLE payment_launch_notify_signups IS '결제 정식 오픈 알림 신청 이메일 목록 - 서비스 롤 전용';
COMMENT ON COLUMN payment_launch_notify_signups.company_id IS '신청 당시 로그인 계정의 회사 ID (참고용, 회사 삭제 시 NULL)';
COMMENT ON COLUMN payment_launch_notify_signups.admin_digest_sent_at IS '이 신청 건이 관리자 요약메일에 포함되어 발송된 시각';
COMMENT ON COLUMN payment_launch_notify_signups.launch_email_sent_at IS '정식 오픈 안내 메일이 이 신청자에게 발송된 시각';
