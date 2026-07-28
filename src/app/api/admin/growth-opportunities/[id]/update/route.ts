import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import type { UpdateOpportunityStatusRequest } from '@/types/growth'

/**
 * POST /api/admin/growth-opportunities/[id]/update
 * Update the status of a growth opportunity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_GROWTH_OPPORTUNITIES)
    }
    const { id } = params
    const body: UpdateOpportunityStatusRequest = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 기존 타임스탬프를 확인해야 "최초 1회만 기록"이 실제로 동작한다 - 방금 만든
    // updateData 객체를 검사하면 항상 undefined라 매번 덮어써지고 있었다(예:
    // contacted 상태에서 메모만 추가로 남겨도 최초 접촉 시각이 계속 갱신됨).
    const { data: existing } = await supabase
      .from('growth_opportunities')
      .select('contacted_at, resolved_at')
      .eq('id', id)
      .single()

    // Prepare update data
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    }

    if (body.notes) {
      updateData.notes = body.notes
    }

    // Set timestamps based on status
    if (body.status === 'contacted' && !existing?.contacted_at) {
      updateData.contacted_at = new Date().toISOString()
    }

    if (
      (body.status === 'converted' || body.status === 'dismissed') &&
      !existing?.resolved_at
    ) {
      updateData.resolved_at = new Date().toISOString()
    }

    // Update the opportunity
    const { data, error } = await supabase
      .from('growth_opportunities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
      }
      console.error('Error updating growth opportunity:', error)
      return NextResponse.json(
        { error: 'Failed to update opportunity' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      opportunity: data,
    })
  } catch (error) {
    console.error('Growth opportunity update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
