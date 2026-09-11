// 로그인 상태에서 새로운 캠페인(UTM/광고ID/네이버 블로그)으로 재방문했을 때
// company_attribution의 last_* 값을 갱신하는 API (노션 42번 CASE 4).
// 비로그인 방문자가 대부분이라 클라이언트는 로그인 여부를 미리 확인하지 않고
// 캠페인 파라미터가 있을 때마다 그냥 호출하고, 여기서 401로 조용히 거른다.
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildLastAttributionFields } from '@/lib/analytics/attribution-server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userProfile?.company_id) {
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    const body = await request.json()
    const row = buildLastAttributionFields(body)

    if (Object.keys(row).length === 0) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const serviceSupabase = createServiceClient()
    const { error } = await serviceSupabase
      .from('company_attribution')
      .update(row as any)
      .eq('company_id', userProfile.company_id)

    if (error) {
      console.error('update-last-touch error:', error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('update-last-touch error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
