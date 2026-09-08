-- 크론 실행 결과(태스크별 상태/카운트)를 남기는 테이블 - Vercel 런타임 로그 보존기간(1h)과 무관하게 실행 이력 확인용
-- Created: 2026-09-08
-- daily-tasks / subscription-billing 크론이 실행 종료 시 1행씩 insert하고,
-- daily-tasks가 90일 지난 행을 매일 정리한다. 서비스 롤 전용(정책 없음).

CREATE TABLE IF NOT EXISTS cron_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_logs_job_started_at ON cron_run_logs(job, started_at DESC);

ALTER TABLE cron_run_logs ENABLE ROW LEVEL SECURITY;

-- 정책 없음(서비스 롤 전용) - 크론 라우트만 서비스 롤로 기록/정리한다.

COMMENT ON TABLE cron_run_logs IS '크론 실행 이력 - job별 시작/종료/소요시간/태스크별 결과(JSON), 서비스 롤 전용, 90일 보관';
COMMENT ON COLUMN cron_run_logs.status IS 'success: 전 태스크 성공, partial: 일부 태스크 error, error: 라우트 자체가 예외로 중단';
COMMENT ON COLUMN cron_run_logs.tasks IS '태스크별 결과 배열 - [{task, status, ...카운트}]';
