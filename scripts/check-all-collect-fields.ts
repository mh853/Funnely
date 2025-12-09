import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 모든 랜딩페이지의 collect_fields 확인 - multiple_choice나 short_answer 타입이 있는 것만
  const { data: pages } = await supabase
    .from('landing_pages')
    .select('id, title, collect_fields')

  console.log('=== 커스텀 필드가 있는 랜딩페이지 ===')
  let count = 0
  pages?.forEach(p => {
    if (Array.isArray(p.collect_fields)) {
      const customFields = p.collect_fields.filter(
        (f: any) => f.type === 'multiple_choice' || f.type === 'short_answer'
      )
      if (customFields.length > 0) {
        count++
        console.log(`\n${p.title} (ID: ${p.id}):`)
        customFields.forEach((f: any) => {
          console.log(`  - type: ${f.type}, question: "${f.question}"`)
          if (f.options) console.log(`    options: ${JSON.stringify(f.options)}`)
        })
      }
    }
  })
  console.log(`\n총 ${count}개의 랜딩페이지에 커스텀 필드가 설정됨`)

  // 테스트4의 collect_fields 확인 (스크린샷의 테스트4)
  const { data: test4 } = await supabase
    .from('landing_pages')
    .select('id, title, collect_fields')
    .ilike('title', '%테스트4%')

  console.log('\n=== 테스트4 랜딩페이지 collect_fields ===')
  test4?.forEach(p => {
    console.log(`${p.title}:`, JSON.stringify(p.collect_fields, null, 2))
  })
}

main()
