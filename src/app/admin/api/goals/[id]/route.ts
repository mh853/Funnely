import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const goalId = params.id
    const supabase = await createClient()

    const { data: goal, error } = await supabase
      .from('performance_goals')
      .select(
        `
        *,
        company:companies!performance_goals_company_id_fkey(id, name),
        created_by_user:users!performance_goals_created_by_fkey(id, full_name)
      `
      )
      .eq('id', goalId)
      .single()

    if (error || !goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // 진행률 계산
    const progress = goal.target_value > 0
      ? (goal.current_value / goal.target_value) * 100
      : 0

    return NextResponse.json({
      goal: {
        ...goal,
        progress: Math.min(progress, 100).toFixed(1),
      },
    })
  } catch (error) {
    console.error('Goal detail API error:', error)
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

    const goalId = params.id
    const body = await request.json()
    const supabase = await createClient()

    const { data: goal, error } = await supabase
      .from('performance_goals')
      .update({
        name: body.name,
        metric: body.metric,
        target_value: body.targetValue,
        current_value: body.currentValue,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ goal })
  } catch (error) {
    console.error('Goal update API error:', error)
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

    const goalId = params.id
    const supabase = await createClient()

    const { error } = await supabase
      .from('performance_goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goal deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
