-- 결제 알림(payment_notifications) 발송이 실패하면 status='failed'로 마킹만 하고 끝이라
-- 재시도 경로가 전혀 없었다(73차 QA) - 구독 만료 시 대시보드 접근 자체가 막히므로
-- 이 이메일이 고객이 사실을 알 수 있는 사실상 유일한 채널인데, 일시적 발송 장애만으로
-- 영구 유실됐다. lead_notification_queue가 이미 쓰는 것과 동일한 retry_count 패턴을 적용한다.
ALTER TABLE payment_notifications
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
