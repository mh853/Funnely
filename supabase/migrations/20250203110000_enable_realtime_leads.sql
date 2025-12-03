-- ============================================================================
-- Enable Realtime for leads table
-- Created: 2025-02-03
-- Description: leads 테이블에 Realtime 기능 활성화
-- ============================================================================

-- leads 테이블을 supabase_realtime publication에 추가
-- 이미 추가되어 있으면 에러가 발생하므로 DO 블록으로 처리
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
    RAISE NOTICE 'leads table added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'leads table already in supabase_realtime publication';
  END IF;
END $$;
