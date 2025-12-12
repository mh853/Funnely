import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import type { CompanyDetailResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const companyId = params.id

    // 회사 기본 정보 조회
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select(
        `
        id,
        name,
        is_active,
        created_at,
        phone,
        address,
        business_number
      `
      )
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 관리자 사용자 조회
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('company_id', companyId)
      .eq('role', 'admin')
      .single()

    // 통계 데이터 조회
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalLeads },
      { count: leadsThisMonth },
      { count: leadsLastMonth },
      { count: totalPages },
      { count: activePages },
    ] = await Promise.all([
      // 총 사용자
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      // 활성 사용자
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true),
      // 총 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      // 이번달 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte(
          'created_at',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
      // 지난달 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte(
          'created_at',
          new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()
        )
        .lt(
          'created_at',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
      // 총 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      // 활성 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_published', true),
    ])

    // 최근 활동 조회 (5개)
    const { data: activities } = await supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        company_id,
        user_id,
        action,
        description,
        metadata,
        ip_address,
        created_at,
        users(full_name)
      `
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      company_id: activity.company_id,
      user_id: activity.user_id,
      user_name: activity.users?.full_name || 'Unknown',
      action: activity.action,
      description: activity.description,
      metadata: activity.metadata,
      ip_address: activity.ip_address,
      created_at: activity.created_at,
    }))

    const response: CompanyDetailResponse = {
      company: {
        id: company.id,
        name: company.name,
        slug: company.id, // Use ID as slug since slug column doesn't exist
        is_active: company.is_active,
        created_at: company.created_at,
        phone: company.phone,
        address: company.address,
        business_number: company.business_number,
        admin_user: {
          id: adminUser?.id || '',
          full_name: adminUser?.full_name || '',
          email: adminUser?.email || '',
        },
        stats: {
          total_users: totalUsers || 0,
          total_leads: totalLeads || 0,
          landing_pages_count: totalPages || 0,
        },
        detailed_stats: {
          active_users: activeUsers || 0,
          inactive_users: (totalUsers || 0) - (activeUsers || 0),
          leads_this_month: leadsThisMonth || 0,
          leads_last_month: leadsLastMonth || 0,
          active_landing_pages: activePages || 0,
        },
        recent_activities: recentActivities,
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
    const companyId = params.id
    const body = await request.json()

    const { is_active } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    // 회사 상태 업데이트
    const { data, error } = await supabase
      .from('companies')
      .update({ is_active })
      .eq('id', companyId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록
    const { data: adminUser } = await supabase.auth.getUser()
    if (adminUser.user) {
      await supabase.from('company_activity_logs').insert({
        company_id: companyId,
        user_id: adminUser.user.id,
        action: 'company_status_changed',
        description: `회사 상태를 ${is_active ? '활성' : '비활성'}으로 변경`,
        metadata: { is_active },
      })
    }

    return NextResponse.json({ company: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
