// 체험 구독을 유료 구독으로 전환하는 API (기존 빌링키 재사용)
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrLegacyOwner } from '@/lib/auth/permissions'
import { convertTrialSubscriptionCore } from '@/lib/subscription/convert-trial-core'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 })

  const { subscriptionId, planId, billingCycle, billingKeySubscriptionId } =
    await request.json()
  if (!subscriptionId)
    return NextResponse.json({ error: '구독 정보가 없습니다.' }, { status: 400 })

  const svc = createServiceClient() as any

  // 현재 구독 확인
  const { data: currentSub } = await svc
    .from('company_subscriptions')
    .select('id, status, billing_key, customer_key, card_info, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사용자 권한 확인 - company_subscriptions RLS(company_subscriptions_admin, admin/owner만
  // 허용, manager 제외)와 서비스 롤 우회 경로의 인가 기준을 반드시 일치시켜야 한다.
  // company_id만 확인하면 marketing_staff 등 최하위 권한도 결제를 트리거할 수 있었다.
  const { data: profile } = await svc
    .from('users')
    .select('company_id, role, simple_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.company_id !== currentSub.company_id || !isAdminOrLegacyOwner(profile)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const result = await convertTrialSubscriptionCore({
    subscriptionId,
    planId,
    billingCycle,
    billingKeySubscriptionId,
    authHeader: `Bearer ${session.access_token}`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ success: true })
}
