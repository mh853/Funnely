import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

// GET: 성과 목표 목록 조회
export async function GET(request: Request) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')

    const supabase = await createClient()

    let query = supabase
      .from('performance_goals')
      .select(
        `
        *,
        company:companies!performance_goals_company_id_fkey(id, name),
        created_by_user:users!performance_goals_created_by_fkey(id, full_name)
      `
      )
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: goals, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 목표별 진행률 계산
    const goalsWithProgress = goals?.map((goal: any) => {
      const progress = goal.target_value > 0
        ? (goal.current_value / goal.target_value) * 100
        : 0

      return {
        ...goal,
        progress: Math.min(progress, 100).toFixed(1),
      }
    })

    return NextResponse.json({ goals: goalsWithProgress || [] })
  } catch (error) {
    console.error('Goals API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 성과 목표 생성
export async function POST(request: Request) {
  try {
    await requireSuperAdmin()

    const body = await request.json()
    const {
      companyId,
      name,
      metric,
      targetValue,
      periodStart,
      periodEnd,
    } = body

    const supabase = await createClient()

    // 현재 사용자 정보
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: goal, error } = await supabase
      .from('performance_goals')
      .insert({
        company_id: companyId,
        name,
        metric,
        target_value: targetValue,
        period_start: periodStart,
        period_end: periodEnd,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Goal creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
