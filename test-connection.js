// Supabase 연결 테스트 스크립트
// 실행: node test-connection.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  console.log('🔍 Supabase 연결 테스트 시작...\n')

  // 1. 환경변수 확인
  console.log('📋 환경변수 확인:')
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '❌ 없음')
  console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '❌ 없음')
  console.log('✅ PHONE_ENCRYPTION_KEY:', process.env.PHONE_ENCRYPTION_KEY ? '설정됨' : '❌ 없음')
  console.log()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Supabase 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  // 2. Supabase 클라이언트 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    // 3. 테이블 존재 확인
    console.log('📊 테이블 확인:')

    const tables = [
      'landing_pages',
      'form_fields',
      'form_submissions',
      'leads',
      'lead_notes',
      'calendar_events'
    ]

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })

      if (error) {
        console.log(`❌ ${table}: 에러 - ${error.message}`)
      } else {
        console.log(`✅ ${table}: 접근 가능`)
      }
    }

    console.log('\n✅ 연결 테스트 완료!')
    console.log('\n💡 다음 단계:')
    console.log('   1. 브라우저에서 http://localhost:3000 접속')
    console.log('   2. 회원가입/로그인')
    console.log('   3. /dashboard/landing-pages 에서 랜딩 페이지 생성 테스트')

  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error.message)
    process.exit(1)
  }
}

testConnection()
