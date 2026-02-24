-- ============================================================================
-- Enable Realtime for landing_pages table
-- Created: 2026-02-22
-- Description: landing_pages 테이블에 Realtime 기능 활성화
--              (타이머 만료 시 대시보드 상태 컬럼 즉시 반영을 위해 필요)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'landing_pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE landing_pages;
    RAISE NOTICE 'landing_pages table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'landing_pages table already in supabase_realtime publication';
  END IF;
END $$;
