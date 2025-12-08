import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/lead-statuses/reorder - 상태 순서 변경
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const body = await request.json()
    const { orderedIds } = body

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: { message: 'orderedIds array is required' } }, { status: 400 })
    }

    // Get user's company and role
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      return NextResponse.json({ error: { message: 'User not associated with a company' } }, { status: 403 })
    }

    // Check admin role
    if (userProfile.simple_role !== 'admin') {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Update sort_order for each status
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('lead_statuses')
        .update({ sort_order: i + 1 })
        .eq('id', orderedIds[i])
        .eq('company_id', userProfile.company_id)

      if (error) throw error
    }

    return NextResponse.json({
      success: true,
      message: '순서가 변경되었습니다.',
    })
  } catch (error: any) {
    console.error('Reorder lead statuses error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to reorder lead statuses' } },
      { status: 500 }
    )
  }
}
