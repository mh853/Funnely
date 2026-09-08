-- 결제 정식 오픈 알림 신청 테이블 제거 - 토스 정식 승인(2026-09-08)으로 기능 종료, 신청자(내부 직원 1명)에게 발송도 불필요 확정
-- Created: 2026-09-08
-- 20260826000001_create_payment_launch_notify_signups.sql 의 역방향.

DROP TABLE IF EXISTS payment_launch_notify_signups;
