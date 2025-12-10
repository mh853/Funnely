import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/leads/change-logs?lead_id=xxx - 리드 변경 이력 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const leadId = request.nextUrl.searchParams.get('lead_id')

    if (!leadId) {
      return NextResponse.json({ error: { message: 'Missing lead_id' } }, { status: 400 })
    }

    // Get user's company
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    // Verify lead belongs to user's company
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: { message: 'Lead not found' } }, { status: 404 })
    }

    // Fetch change logs with user info
    const { data: logs, error } = await supabase
      .from('lead_status_logs')
      .select(`
        id,
        field_type,
        previous_status,
        new_status,
        previous_value,
        new_value,
        notes,
        created_at,
        changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching change logs:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
    })
  } catch (error: any) {
    console.error('Change logs fetch error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch change logs' } },
      { status: 500 }
    )
  }
}
