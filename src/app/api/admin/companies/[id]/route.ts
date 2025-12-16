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

    // 회사 소속 사용자 목록
    const { data: users } = await supabase
      .from('profiles')
      .select(
        `
        id,
        user_id,
        full_name,
        users!inner(email)
      `
      )
      .eq('company_id', params.id)
      .limit(50)

    const formattedUsers = (users || []).map((user: any) => ({
      id: user.user_id,
      email: user.users?.email || '',
      full_name: user.full_name || '',
      role: 'user', // TODO: 역할 시스템 연동 시 실제 역할 반영
    }))

    // 최근 활동 통계 (30일)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 로그인 수 (감사 로그에서 조회)
    const { count: loginCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', params.id)
      .eq('action', 'admin.login')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // 생성된 리드 수
    const { count: leadCreatedCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // 마지막 활동 시간
    const { data: lastActivity } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('company_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 구독 정보
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('company_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 4. 응답 구성
    const companyDetail = {
      ...company,
      users: formattedUsers,
      recent_activity: {
        login_count_30d: loginCount || 0,
        lead_created_30d: leadCreatedCount || 0,
        last_activity_at: lastActivity?.created_at || null,
      },
      subscription: subscription || null,
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
      updateData.status = status
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
        status: company.status,
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

    // 제약 조건 확인: 활성 사용자
    const { count: activeUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', params.id)

    if (activeUserCount && activeUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete company with ${activeUserCount} active user(s). Remove or reassign users first.`,
        },
        { status: 409 }
      )
    }

    // 제약 조건 확인: 활성 구독
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
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
      // 소프트 삭제 (status를 'deleted'로 변경)
      const { error: updateError } = await supabase
        .from('companies')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
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
        slug: company.slug,
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
