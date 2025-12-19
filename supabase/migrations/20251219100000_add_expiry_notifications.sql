-- 구독 만료 알림 시스템 구현
-- 1. 알림 발송 로그 테이블 생성 (중복 방지)
-- 2. grace_period_end 컬럼 추가 (결제 실패 시 유예 기간)

-- 1. notification_sent_logs 테이블 생성
CREATE TABLE IF NOT EXISTS notification_sent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES company_subscriptions(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (빠른 중복 체크)
CREATE INDEX IF NOT EXISTS idx_notification_logs_subscription
  ON notification_sent_logs(subscription_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at
  ON notification_sent_logs(sent_at);

-- 2. company_subscriptions 테이블에 grace_period_end 컬럼 추가
ALTER TABLE company_subscriptions
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- 3. notification_type enum에 새로운 타입 추가 (notifications 테이블에서 사용)
-- subscription_expiring_soon: 만료 7일 전 알림
-- subscription_expired: 만료됨 알림
-- subscription_in_grace_period: 유예 기간 진입 알림

-- 4. 기존 active 구독에 대한 초기화 (grace_period_end는 NULL로 유지)
-- 이미 만료된 구독은 status = 'expired'로 업데이트
UPDATE company_subscriptions
SET status = 'expired'
WHERE status IN ('active', 'trial')
  AND current_period_end < NOW()
  AND grace_period_end IS NULL;

-- 완료 로그
DO $$
DECLARE
  log_count INT;
BEGIN
  SELECT COUNT(*) INTO log_count FROM notification_sent_logs;

  RAISE NOTICE '✅ Subscription expiry notification system migration completed:';
  RAISE NOTICE '   - notification_sent_logs table created';
  RAISE NOTICE '   - grace_period_end column added to company_subscriptions';
  RAISE NOTICE '   - Existing notification logs: %', log_count;
END $$;
