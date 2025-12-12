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
    if (body.status === 'cancelled') updateData.cancelled_at = new Date().toISOString()

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
