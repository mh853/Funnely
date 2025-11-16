import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/test-connection - Supabase 연결 테스트
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env_check: {},
    table_check: {},
    summary: { success: true, errors: [] }
  }

  try {
    // 1. 환경변수 확인
    results.env_check = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      PHONE_ENCRYPTION_KEY: !!process.env.PHONE_ENCRYPTION_KEY,
      NEXT_PUBLIC_URL: !!process.env.NEXT_PUBLIC_URL,
    }

    // 환경변수 누락 확인
    Object.entries(results.env_check).forEach(([key, value]) => {
      if (!value) {
        results.summary.errors.push(`❌ ${key} 환경변수가 설정되지 않았습니다.`)
      }
    })

    // 2. Supabase 연결 테스트
    const supabase = await createClient()

    const tables = [
      'landing_pages',
      'landing_page_versions',
      'landing_page_sections',
      'form_fields',
      'form_submissions',
      'leads',
      'lead_notes',
      'calendar_events'
    ]

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          results.table_check[table] = {
            status: '❌ 에러',
            error: error.message,
            count: 0
          }
          results.summary.errors.push(`❌ ${table}: ${error.message}`)
        } else {
          results.table_check[table] = {
            status: '✅ 접근 가능',
            count: count || 0
          }
        }
      } catch (err: any) {
        results.table_check[table] = {
          status: '❌ 예외',
          error: err.message,
          count: 0
        }
        results.summary.errors.push(`❌ ${table}: ${err.message}`)
      }
    }

    // 3. 결과 요약
    results.summary.success = results.summary.errors.length === 0
    results.summary.total_tables = tables.length
    results.summary.accessible_tables = Object.values(results.table_check)
      .filter((t: any) => t.status === '✅ 접근 가능').length

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    results.summary.success = false
    results.summary.errors.push(`❌ 전체 테스트 실패: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}
