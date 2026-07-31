import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  try {
    // 레이트리밋 없이 회사명 존재 여부를 무제한 조회할 수 있어 전체 고객사명을
    // 스캔당할 수 있었다. signup 라우트와 동일한 패턴으로 IP당 제한한다.
    const ip = getClientIp(request)
    if (!checkRateLimit(`check-company-name:${ip}`, 20, 5 * 60 * 1000)) {
      return NextResponse.json({ exists: false }, { status: 429 })
    }

    const { name } = await request.json()

    if (!name || name.trim().length < 1) {
      return NextResponse.json({ exists: false })
    }

    const supabase = createAdminClient()
    const { count } = await supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .ilike('name', name.trim())

    return NextResponse.json({ exists: (count ?? 0) > 0 })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
