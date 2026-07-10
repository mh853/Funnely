import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

/**
 * GET /api/admin/companies/[id]
 * 특정 회사 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)

    // 3. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 회사 기본 정보
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', params.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // OverviewTab이 실제로 읽는 필드는 stats/detailed_stats/recent_activities뿐이다
    // (admin_user/users/subscription/recent_activity(단수)는 어디서도 소비되지 않으며,
    // 존재하지 않는 profiles/subscriptions 테이블과 company_id 컬럼이 없는 audit_logs를
    // 잘못 참조하고 있어 제거한다).
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalLeads },
      { count: leadsThisMonth },
      { count: leadsLastMonth },
      { count: totalLandingPages },
      { count: activeLandingPages },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id)
        .eq('is_active', true),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id)
        .gte('created_at', startOfThisMonth),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id)
        .gte('created_at', startOfLastMonth)
        .lt('created_at', startOfThisMonth),
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id),
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', params.id)
        .eq('is_active', true)
        .eq('status', 'published'),
    ])

    // 최근 활동 (company_activity_logs 실제 컬럼명: activity_type/activity_description)
    const { data: activities } = await supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        company_id,
        user_id,
        activity_type,
        activity_description,
        metadata,
        created_at,
        users(full_name)
      `
      )
      .eq('company_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      company_id: activity.company_id,
      user_id: activity.user_id,
      user_name: activity.users?.full_name || 'Unknown',
      action: activity.activity_type,
      description: activity.activity_description || activity.activity_type,
      metadata: activity.metadata,
      created_at: activity.created_at,
    }))

    // 4. 응답 구성
    const companyDetail = {
      ...company,
      stats: {
        total_users: totalUsers || 0,
        total_leads: totalLeads || 0,
        landing_pages_count: totalLandingPages || 0,
      },
      detailed_stats: {
        active_users: activeUsers || 0,
        inactive_users: (totalUsers || 0) - (activeUsers || 0),
        leads_this_month: leadsThisMonth || 0,
        leads_last_month: leadsLastMonth || 0,
        active_landing_pages: activeLandingPages || 0,
      },
      recent_activities: recentActivities,
    }

    return NextResponse.json({
      success: true,
      company: companyDetail,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/companies/[id]
 * 회사 정보 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

    // 3. 요청 바디 파싱
    const body = await request.json()
    const { name, status } = body

    // 업데이트할 필드 구성
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid field: name', field: 'name' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (status !== undefined) {
      // companies 테이블에는 'status' 컬럼이 없다 (is_active boolean으로 관리됨).
      // 그대로 update({ status })를 시도하면 존재하지 않는 컬럼 에러로 요청 전체가 실패한다.
      const validStatuses = ['active', 'inactive', 'suspended']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            field: 'status',
          },
          { status: 400 }
        )
      }
      updateData.is_active = status === 'active'
    }

    // 4. Supabase Update
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: company, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error || !company) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        )
      }
      console.error('[Companies API] Update error:', error)
      return NextResponse.json(
        { error: 'Failed to update company' },
        { status: 500 }
      )
    }

    // 5. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.COMPANY_UPDATE,
      entityType: 'company',
      entityId: company.id,
      metadata: {
        name: company.name,
        is_active: company.is_active,
        updatedFields: Object.keys(body),
        updatedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 6. 응답
    return NextResponse.json({
      success: true,
      company,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/companies/[id]
 * 회사 활성화/비활성화 토글 (관리자 companies 상세 페이지의 "활성화/비활성화" 버튼이
 * 호출하는 엔드포인트. PATCH 핸들러가 없어 항상 405로 실패하고 있었다.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

    const body = await request.json()
    const { is_active } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: company, error } = await supabase
      .from('companies')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error || !company) {
      if (error?.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }
      console.error('[Companies API] Patch error:', error)
      return NextResponse.json(
        { error: 'Failed to update company' },
        { status: 500 }
      )
    }

    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: is_active ? AUDIT_ACTIONS.COMPANY_ACTIVATE : AUDIT_ACTIONS.COMPANY_DEACTIVATE,
      entityType: 'company',
      entityId: company.id,
      metadata: {
        name: company.name,
        is_active: company.is_active,
        updatedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    return NextResponse.json({
      success: true,
      company,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * 회사 삭제 (소프트/하드 삭제)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_COMPANIES)

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 회사 존재 확인
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // 제약 조건 확인: 활성 사용자 (profiles 테이블은 존재하지 않으며 실제 사용자 테이블은 users)
    const { count: activeUserCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', params.id)
      .eq('is_active', true)

    if (activeUserCount && activeUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete company with ${activeUserCount} active user(s). Remove or reassign users first.`,
        },
        { status: 409 }
      )
    }

    // 제약 조건 확인: 활성 구독 (subscriptions 테이블은 존재하지 않으며 실제 테이블은 company_subscriptions)
    const { data: activeSubscription } = await supabase
      .from('company_subscriptions')
      .select('id, status')
      .eq('company_id', params.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (activeSubscription) {
      return NextResponse.json(
        {
          error:
            'Cannot delete company with active subscription. Cancel subscription first.',
        },
        { status: 409 }
      )
    }

    // 5. 삭제 실행
    if (hard) {
      // 하드 삭제
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', params.id)

      if (deleteError) {
        console.error('[Companies API] Hard delete error:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete company' },
          { status: 500 }
        )
      }
    } else {
      // 소프트 삭제 (companies 테이블에는 status 컬럼이 없으며, is_active/withdrawn_at으로 관리된다)
      const { error: updateError } = await supabase
        .from('companies')
        .update({ is_active: false, withdrawn_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', params.id)

      if (updateError) {
        console.error('[Companies API] Soft delete error:', updateError)
        return NextResponse.json(
          { error: 'Failed to delete company' },
          { status: 500 }
        )
      }
    }

    // 6. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.COMPANY_DELETE,
      entityType: 'company',
      entityId: company.id,
      metadata: {
        name: company.name,
        deletionType: hard ? 'hard' : 'soft',
        deletedBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 7. 응답
    return NextResponse.json({
      success: true,
      deletedCompanyId: params.id,
      deletionType: hard ? 'hard' : 'soft',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith('Permission denied')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[Companies API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
