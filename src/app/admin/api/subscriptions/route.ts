import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('company_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    // 구독 정보 조회
    let query = supabase
      .from('company_subscriptions')
      .select(
        `
        *,
        company:companies!company_subscriptions_company_id_fkey(id, name, email),
        plan:subscription_plans!company_subscriptions_plan_id_fkey(id, name, price_monthly, price_yearly, max_users, max_leads)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: subscriptions, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      subscriptions: subscriptions || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Subscriptions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: body.companyId,
        plan_id: body.planId,
        status: body.status || 'trial',
        billing_cycle: body.billingCycle || 'monthly',
        current_period_start: body.currentPeriodStart || new Date().toISOString(),
        current_period_end: body.currentPeriodEnd,
        trial_end: body.trialEnd,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Subscription creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
