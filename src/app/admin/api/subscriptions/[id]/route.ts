import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const subscriptionId = params.id
    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('company_subscriptions')
      .select(
        `
        *,
        company:companies!company_subscriptions_company_id_fkey(id, name, email, phone),
        plan:subscription_plans!company_subscriptions_plan_id_fkey(*)
      `
      )
      .eq('id', subscriptionId)
      .single()

    if (error || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Subscription detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const subscriptionId = params.id
    const body = await request.json()
    const supabase = await createClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.planId) updateData.plan_id = body.planId
    if (body.status) updateData.status = body.status
    if (body.billingCycle) updateData.billing_cycle = body.billingCycle
    if (body.currentPeriodStart) updateData.current_period_start = body.currentPeriodStart
    if (body.currentPeriodEnd) updateData.current_period_end = body.currentPeriodEnd
    if (body.trialEnd) updateData.trial_end = body.trialEnd
    // 취소 상태로 변경 시 취소일 기록
    if (body.status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
    // trial → active 전환 시 has_used_trial 설정
    if (body.status === 'trial' || body.status === 'active') updateData.has_used_trial = true

    // active 재활성화 시 기간 미지정이면 오늘부터 billing_cycle 기간 연장
    if (body.status === 'active' && !body.currentPeriodEnd) {
      const { data: currentRaw } = await supabase
        .from('company_subscriptions')
        .select('status, current_period_end, billing_cycle')
        .eq('id', subscriptionId)
        .single()

      const current = currentRaw as {
        status: string
        current_period_end: string | null
        billing_cycle: string | null
      } | null

      const needsExtension =
        current &&
        (['expired', 'cancelled', 'suspended'].includes(current.status) ||
          (current.current_period_end && current.current_period_end < new Date().toISOString()))

      if (needsExtension) {
        const now = new Date()
        const cycle = current?.billing_cycle
        const periodEnd = new Date(now)
        if (cycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }
        updateData.current_period_start = now.toISOString()
        updateData.current_period_end = periodEnd.toISOString()
        updateData.grace_period_end = null
        updateData.cancelled_at = null
      }
    }

    const { data: subscription, error } = await supabase
      .from('company_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Subscription update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const subscriptionId = params.id
    const supabase = await createClient()

    const { error } = await supabase
      .from('company_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscription deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
