import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: payments, error } = await supabase
      .from('payment_transactions')
      .select(`
        id,
        total_amount,
        approved_at,
        status,
        subscription_id
      `)
      .eq('company_id', params.id)
      .eq('status', 'success')
      .order('approved_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const rows = (payments || []).map((p: any, i: number) => ({
      sequence: (payments?.length || 0) - i,
      date: p.approved_at,
      planName: '-',
      amount: p.total_amount || 0,
    }))

    return NextResponse.json({ payments: rows })
  } catch (error) {
    console.error('[Payments API] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
