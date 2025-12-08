import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/leads/payments/audit?lead_id=xxx - 결제 내역 감사 로그 조회 (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const leadId = searchParams.get('lead_id')

    if (!leadId) {
      return NextResponse.json({ error: { message: 'Missing lead_id' } }, { status: 400 })
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

    // Check admin role (simple_role: admin)
    if (userProfile.simple_role !== 'admin') {
      return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 403 })
    }

    // Get audit logs (foreign key 관계 없이 단순 조회)
    const { data: logs, error } = await supabase
      .from('payment_audit_logs')
      .select('*')
      .eq('lead_id', leadId)
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Get user names for created_by IDs
    const userIds = Array.from(new Set((logs || []).map(log => log.created_by).filter(Boolean)))
    let userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      userMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user.full_name
        return acc
      }, {} as Record<string, string>)
    }

    // Transform to include user_name
    const transformedLogs = (logs || []).map(log => ({
      ...log,
      user_name: log.created_by ? userMap[log.created_by] || null : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        logs: transformedLogs,
      },
    })
  } catch (error: any) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to get audit logs' } },
      { status: 500 }
    )
  }
}
