-- ============================================================================
-- Supabase 데이터베이스 연동 확인 스크립트
-- ============================================================================

-- 1. 테이블 존재 확인
SELECT
  '📊 테이블 확인' as check_type,
  table_name,
  '✅ 존재' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'landing_pages',
    'landing_page_versions',
    'landing_page_sections',
    'form_fields',
    'form_submissions',
    'leads',
    'lead_notes',
    'calendar_events'
  )
ORDER BY table_name;

-- 2. ENUM 타입 확인
SELECT
  '🔤 ENUM 타입 확인' as check_type,
  typname as enum_name,
  '✅ 존재' as status
FROM pg_type
WHERE typname IN ('lead_status', 'lead_priority', 'event_type')
ORDER BY typname;

-- 3. RLS (Row Level Security) 활성화 확인
SELECT
  '🔒 RLS 확인' as check_type,
  tablename as table_name,
  CASE
    WHEN rowsecurity THEN '✅ 활성화됨'
    ELSE '❌ 비활성화됨'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'landing_pages',
    'landing_page_versions',
    'landing_page_sections',
    'form_fields',
    'form_submissions',
    'leads',
    'lead_notes',
    'calendar_events'
  )
ORDER BY tablename;

-- 4. 함수 존재 확인
SELECT
  '⚙️ 함수 확인' as check_type,
  proname as function_name,
  '✅ 존재' as status
FROM pg_proc
WHERE proname IN (
  'auto_assign_lead',
  'increment_landing_page_views',
  'increment_landing_page_submissions'
)
ORDER BY proname;

-- 5. 인덱스 확인
SELECT
  '📑 인덱스 확인' as check_type,
  tablename,
  indexname,
  '✅ 존재' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'landing_pages',
    'form_submissions',
    'leads',
    'calendar_events'
  )
ORDER BY tablename, indexname;
