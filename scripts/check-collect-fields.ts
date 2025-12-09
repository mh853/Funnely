import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 랜딩페이지의 collect_fields 확인
  const { data: pages } = await supabase
    .from('landing_pages')
    .select('id, title, collect_fields')
    .limit(5)
  
  console.log('=== Landing Pages collect_fields ===')
  pages?.forEach(p => {
    console.log(`\n${p.title}:`)
    console.log(JSON.stringify(p.collect_fields, null, 2))
  })

  // 최근 리드의 custom_fields 확인
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, custom_fields, custom_field_1, custom_field_2, landing_page_id')
    .order('created_at', { ascending: false })
    .limit(5)
  
  console.log('\n=== Recent Leads custom_fields ===')
  leads?.forEach(l => {
    console.log(`\n${l.name}:`)
    console.log('  custom_fields:', JSON.stringify(l.custom_fields))
    console.log('  custom_field_1:', l.custom_field_1)
    console.log('  custom_field_2:', l.custom_field_2)
  })
}

main()
