import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
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

    // TODO: Add proper RBAC permission check for MANAGE_GROWTH_OPPORTUNITIES

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

    // Prepare update data
    const updateData: any = {
      status: body.status,
      updated_at: new Date().toISOString(),
    }

    if (body.notes) {
      updateData.notes = body.notes
    }

    // Set timestamps based on status
    if (body.status === 'contacted' && !updateData.contacted_at) {
      updateData.contacted_at = new Date().toISOString()
    }

    if (
      (body.status === 'converted' || body.status === 'dismissed') &&
      !updateData.resolved_at
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
      console.error('Error updating growth opportunity:', error)
      return NextResponse.json(
        { error: 'Failed to update opportunity' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
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
