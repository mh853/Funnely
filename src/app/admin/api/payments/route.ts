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

    let query = supabase
      .from('payments')
      .select(
        `
        *,
        company:companies!payments_company_id_fkey(id, name, email),
        subscription:company_subscriptions!payments_subscription_id_fkey(
          id,
          plan:subscription_plans!company_subscriptions_plan_id_fkey(name)
        )
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

    const { data: payments, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      payments: payments || [],
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
    console.error('Payments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
