// 프로 플랜 7일 무료 체험 시작 API — 서비스 롤로 RLS 우회하여 안정적으로 처리
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, planId, billingCycle, companyId } = body

    if (!planId) {
      return NextResponse.json({ error: '플랜 정보가 누락되었습니다.' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient()

    // 서비스 롤로 플랜 확인
    const { data: plan } = await serviceSupabase
      .from('subscription_plans')
      .select('id, name')
      .eq('id', planId)
      .single() as { data: { id: string; name: string } | null; error: any }

    if (!plan || (plan as any).name !== '프로') {
      return NextResponse.json({ error: '프로 플랜만 무료 체험이 가능합니다.' }, { status: 400 })
    }

    const now = new Date()
    const trialEndDate = new Date(now)
    trialEndDate.setDate(trialEndDate.getDate() + 7)

    const svc = serviceSupabase as any

    if (subscriptionId) {
      // 기존 구독 업데이트
      const { error } = await svc
        .from('company_subscriptions')
        .update({
          plan_id: planId,
          billing_cycle: billingCycle || 'monthly',
          status: 'trial',
          current_period_start: now.toISOString(),
          current_period_end: null,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          has_used_trial: true,
        })
        .eq('id', subscriptionId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else if (companyId) {
      // 새 구독 생성
      const { error } = await svc
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: planId,
          status: 'trial',
          billing_cycle: billingCycle || 'monthly',
          current_period_start: now.toISOString(),
          current_period_end: null,
          trial_start_date: now.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          has_used_trial: true,
        })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: '구독 정보가 누락되었습니다.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Start Trial] 오류:', error)
    return NextResponse.json({ error: error.message || '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
