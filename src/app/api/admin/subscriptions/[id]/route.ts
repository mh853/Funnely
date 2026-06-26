import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

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

    // active로 재활성화 시 current_period_end가 과거면 오늘부터 연장
    if (status === 'active') {
      const { data: current } = await supabase
        .from('company_subscriptions')
        .select('status, current_period_end, billing_cycle')
        .eq('id', subscriptionId)
        .single()

      const reactivatingFromExpired =
        current &&
        ['expired', 'cancelled', 'suspended'].includes(current.status)

      const periodEndInPast =
        current?.current_period_end &&
        current.current_period_end < new Date().toISOString()

      if (reactivatingFromExpired || periodEndInPast) {
        const now = new Date()
        const cycle = current?.billing_cycle
        const periodStart = now.toISOString()
        let periodEnd: Date
        if (cycle === 'yearly') {
          periodEnd = new Date(now)
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          // monthly (기본)
          periodEnd = new Date(now)
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }
        updateData.current_period_start = periodStart
        updateData.current_period_end = periodEnd.toISOString()
        updateData.grace_period_end = null
        updateData.cancelled_at = null
      }
    }

    const { data, error } = await supabase
      .from('company_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      console.error('[Subscription Update API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // 5. 성공 응답
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
