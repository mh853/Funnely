import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'

/**
 * GET /api/admin/goals
 * admin/goals/page.tsx가 호출하는 엔드포인트. 이 라우트가 존재하지 않아
 * 항상 실패하고 있었다 (레거시 admin/api/goals/route.ts만 존재, 호출하는 곳 없음).
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
      console.error('[Admin Goals API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const goalsWithProgress = (goals || []).map((goal: any) => {
      const progress = goal.target_value > 0
        ? (goal.current_value / goal.target_value) * 100
        : 0

      return {
        ...goal,
        progress: Math.min(progress, 100).toFixed(1),
      }
    })

    return NextResponse.json({ goals: goalsWithProgress })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('[Admin Goals API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
