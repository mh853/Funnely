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
        phone,
        role,
        simple_role,
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

    // 권한 정보 — PATCH가 실제로 쓰는 simple_role을 우선 기준으로 삼는다.
    // GET이 계속 레거시 role만 봤다면, 관리자가 역할을 바꿔도 상세 화면에는
    // 항상 예전 값이 표시되어 "변경이 실패한 것처럼" 보인다 (실제 저장은 성공함).
    const effectiveRole = (user as any).simple_role || user.role
    const permissions: string[] = []
    switch (effectiveRole) {
      case 'company_owner':
      case 'admin': // simple_role
        permissions.push('manage_users', 'manage_leads', 'manage_pages', 'view_reports', 'manage_billing')
        break
      case 'company_admin':
        permissions.push('manage_users', 'manage_leads', 'manage_pages', 'view_reports')
        break
      case 'marketing_manager':
      case 'manager': // simple_role
        permissions.push('manage_leads', 'manage_pages', 'view_reports')
        break
      case 'marketing_staff':
      case 'user': // simple_role
      case 'staff': // Legacy
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
        phone: user.phone,
        role: effectiveRole,
        is_active: user.is_active,
        last_login_at: user.last_login, // 실제 컬럼명은 last_login
        created_at: user.created_at,
        company: {
          id: (user.companies as any).id,
          name: (user.companies as any).name,
          is_active: (user.companies as any).is_active,
        },
        stats: {
          total_leads: totalLeads || 0,
          total_landing_pages: totalPages || 0,
          leads_this_month: leadsThisMonth || 0,
          pages_published: pagesPublished || 0,
        },
        recent_activities: (activities || []).map((activity: any) => ({
          id: activity.id,
          action: activity.action,
          description: activity.description,
          metadata: activity.metadata,
          ip_address: activity.ip_address,
          created_at: activity.created_at,
        })) as any,
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
    // 이 화면(SettingsTab, ROLE_OPTIONS)이 보내는 값은 'admin'|'manager'|'user' 3단계
    // 권한 체계로, users.role(레거시 enum user_role: hospital_owner 등)이 아니라
    // simple_role(enum simple_user_role) 컬럼에 저장해야 하는 값이다. role 컬럼에 쓰면
    // Postgres가 잘못된 enum 값이라며 거부해 매번 500이 나고, 설사 성공하더라도
    // 대시보드 팀 관리 권한 체크(simple_role === 'admin')는 전혀 영향을 받지 않는다.
    const updateData: any = {}
    if (role !== undefined) updateData.simple_role = role
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
