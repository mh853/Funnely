import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { addMonthsClamped } from '@/lib/utils/date'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * PATCH /api/admin/subscriptions/[id]
 * 구독 상태 업데이트
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. URL 파라미터 및 요청 바디 파싱
    const params = await context.params
    const subscriptionId = params.id
    const body = await request.json()
    const { status } = body

    // 3. 유효성 검사
    const validStatuses = ['active', 'trial', 'expired', 'cancelled', 'suspended']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. Supabase 업데이트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateData: any = { status }

    // cancelled 상태로 변경 시 cancelled_at 자동 설정
    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
    }

    // trial로 전환 시 trial_end_date가 없으면 만료 체크가 절대 걸리지 않아 무기한
    // 무료 이용이 가능해진다 (expired 페이지/헬스스코어 모두 trial_end_date 기준으로
    // 판단함). trial_end_date가 이미 있으면 그대로 두고, 없을 때만 7일 체험으로 새로 설정한다.
    if (status === 'trial') {
      const { data: current } = await supabase
        .from('company_subscriptions')
        .select('trial_end_date')
        .eq('id', subscriptionId)
        .single()

      if (!current?.trial_end_date) {
        const now = new Date()
        const trialEnd = new Date(now)
        trialEnd.setDate(trialEnd.getDate() + 7)
        updateData.trial_start_date = now.toISOString()
        updateData.trial_end_date = trialEnd.toISOString()
      }
    }

    // active로 재활성화 시 current_period_end가 과거면 오늘부터 연장
    if (status === 'active') {
      const { data: current } = await supabase
        .from('company_subscriptions')
        .select('status, current_period_end, billing_cycle')
        .eq('id', subscriptionId)
        .single()

      // active로 전환하는 모든 경우에 cancelled_at을 지워야 한다 - 기간 리셋 여부와
      // 무관하게, 결제 기간이 남은 채로 취소된 구독을 재활성화해도 이 조건 안에서만
      // 리셋되던 것을 밖으로 빼서, "상태는 active인데 취소일이 남아있는" 모순된
      // 화면(고객 셀프서비스 reactivate 라우트는 이미 이렇게 처리 중)을 없앤다.
      updateData.cancelled_at = null

      // 재활성화 시 기간을 리셋해야 하는 조건은 "현재 결제 기간이 이미 지났다" 또는
      // "애초에 결제 기간이 없었다" 뿐이다. 이전 status(expired/cancelled/suspended)
      // 만으로 리셋하면, 아직 결제 기간이 남은 채로 정지/취소된 구독을 재활성화할 때
      // 남은 기간이 통째로 사라지고 오늘부터 새 기간으로 강제 리셋되는 버그가 생긴다.
      const periodEndInPast =
        current?.current_period_end &&
        current.current_period_end < new Date().toISOString()

      // trial(또는 그 외 결제 기간이 아예 없던 상태)에서 active로 전환하는 경우도
      // 포함해야 한다. 그렇지 않으면 "정식 전환"이 current_period_end를 null로 남겨
      // 미들웨어의 만료 체크(current_period_end !== null 조건)를 절대 통과하지 못하는
      // 상태가 되어, 결제 기록도 카드도 없이 영구 무료 이용이 가능해진다.
      const neverHadPeriod = current && !current.current_period_end

      if (periodEndInPast || neverHadPeriod) {
        const now = new Date()
        const cycle = current?.billing_cycle
        const periodStart = now.toISOString()
        const periodEnd =
          cycle === 'yearly'
            ? addMonthsClamped(now, 12)
            : addMonthsClamped(now, 1) // monthly (기본)
        updateData.current_period_start = periodStart
        updateData.current_period_end = periodEnd.toISOString()
        updateData.grace_period_end = null
      }
    }

    const { data, error } = await supabase
      .from('company_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }
      console.error('[Subscription Update API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    // 5. 감사 로그 기록 - 결제상태를 직접 바꾸는 민감한 작업인데 지금까지 기록이
    // 전혀 없어 어떤 관리자가 언제 어떤 근거로 정지/취소/재활성화했는지 추적할
    // 수단이 없었다(49차 QA 확인). AUDIT_ACTIONS에 이미 정의돼 있던 상수를 사용한다.
    const auditAction =
      status === 'cancelled'
        ? AUDIT_ACTIONS.SUBSCRIPTION_CANCEL
        : status === 'active'
          ? AUDIT_ACTIONS.SUBSCRIPTION_RENEW
          : AUDIT_ACTIONS.SUBSCRIPTION_UPDATE
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: auditAction,
      entityType: 'subscription',
      entityId: subscriptionId,
      companyId: data?.company_id,
      metadata: { newStatus: status },
    })

    // 6. 성공 응답
    return NextResponse.json({
      success: true,
      subscription: data,
    })
  } catch (error) {
    console.error('[Subscription Update API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
