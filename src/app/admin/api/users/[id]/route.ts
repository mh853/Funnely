import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { UserDetailResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const userId = params.id

    // 사용자 기본 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        last_login,
        company_id,
        companies!inner(
          id,
          name,
          is_active
        )
      `
      )
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 통계 데이터 조회
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      { count: totalLeads },
      { count: leadsThisMonth },
      { count: totalPages },
      { count: pagesPublished },
    ] = await Promise.all([
      // 총 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 이번달 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thisMonthStart.toISOString()),
      // 총 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // 발행된 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_published', true),
    ])

    // 최근 활동 조회 (5개)
    const { data: activities } = await supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        action,
        description,
        metadata,
        ip_address,
        created_at
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    // 권한 정보 (현재는 role 기반, 나중에 확장 가능)
    const permissions: string[] = []
    switch (user.role) {
      case 'admin':
        permissions.push('manage_users', 'manage_leads', 'manage_pages', 'view_reports')
        break
      case 'manager':
        permissions.push('manage_leads', 'manage_pages', 'view_reports')
        break
      case 'staff':
        permissions.push('manage_leads', 'view_pages')
        break
      case 'viewer':
        permissions.push('view_leads', 'view_pages')
        break
    }

    const response: UserDetailResponse = {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: null, // phone 컬럼이 users 테이블에 없음
        role: user.role,
        is_active: user.is_active,
        last_login_at: user.last_login, // 실제 컬럼명은 last_login
        created_at: user.created_at,
        company: {
          id: user.companies.id,
          name: user.companies.name,
          is_active: user.companies.is_active,
        },
        stats: {
          total_leads: totalLeads || 0,
          total_landing_pages: totalPages || 0,
          leads_this_month: leadsThisMonth || 0,
          pages_published: pagesPublished || 0,
        },
        recent_activities: (activities || []).map((activity) => ({
          id: activity.id,
          action: activity.action,
          description: activity.description,
          metadata: activity.metadata,
          ip_address: activity.ip_address,
          created_at: activity.created_at,
        })),
        permissions,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('API error:', error)
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

    const supabase = await createClient()
    const userId = params.id
    const body = await request.json()

    const { role, is_active } = body

    // 업데이트할 데이터 준비
    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // 사용자 상태 업데이트
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록
    const { data: adminUser } = await supabase.auth.getUser()
    if (adminUser.user) {
      const description = []
      if (role !== undefined) description.push(`역할을 ${role}로 변경`)
      if (is_active !== undefined)
        description.push(`상태를 ${is_active ? '활성' : '비활성'}으로 변경`)

      await supabase.from('company_activity_logs').insert({
        company_id: data.company_id,
        user_id: adminUser.user.id,
        action: 'user_updated',
        description: description.join(', '),
        metadata: { target_user_id: userId, ...updateData },
      })
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
