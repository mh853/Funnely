import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function detectDeviceType(userAgent: string | null): 'pc' | 'mobile' | 'tablet' | 'unknown' {
  if (!userAgent) return 'unknown'

  const ua = userAgent.toLowerCase()

  // 태블릿 감지 (모바일보다 먼저 체크해야 함)
  if (/ipad|android(?!.*mobile)|tablet|playbook|silk/i.test(ua)) {
    return 'tablet'
  }

  // 모바일 감지
  if (/mobile|iphone|ipod|android.*mobile|webos|blackberry|opera mini|opera mobi|iemobile|windows phone/i.test(ua)) {
    return 'mobile'
  }

  // 봇/크롤러 감지 (unknown 처리)
  if (/bot|crawler|spider|scraper|headless/i.test(ua)) {
    return 'unknown'
  }

  // 나머지는 PC로 간주
  return 'pc'
}

async function updateDeviceTypes() {
  console.log('Fetching leads with unknown or null device_type...')

  // device_type이 null이거나 unknown인 리드 조회
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, user_agent, device_type')
    .or('device_type.is.null,device_type.eq.unknown')

  if (error) {
    console.error('Error fetching leads:', error)
    return
  }

  console.log(`Found ${leads?.length || 0} leads to update`)

  if (!leads || leads.length === 0) {
    console.log('No leads to update')
    return
  }

  let updated = 0
  let skipped = 0

  for (const lead of leads) {
    const newDeviceType = detectDeviceType(lead.user_agent)

    // user_agent가 없으면 unknown 유지
    if (!lead.user_agent) {
      skipped++
      continue
    }

    // 새로운 device_type이 기존과 다르면 업데이트
    if (newDeviceType !== lead.device_type) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ device_type: newDeviceType })
        .eq('id', lead.id)

      if (updateError) {
        console.error(`Error updating lead ${lead.id}:`, updateError)
      } else {
        console.log(`Updated lead ${lead.id}: ${lead.device_type} -> ${newDeviceType}`)
        updated++
      }
    } else {
      skipped++
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`)
}

updateDeviceTypes()
