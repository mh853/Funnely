import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin/permissions'
import { getKSTNow, getKSTMonthStart } from '@/lib/utils/date'
import type { UserDetailResponse } from '@/types/admin'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    // requireSuperAdmin()은 애플리케이션 레벨 체크일 뿐 세션 클라이언트의 RLS를
    // 우회하지 않는다. users RLS가 같은 회사로 스코핑되어 있어, 세션 클라이언트로는
    // 관리자가 자신과 다른 회사 소속 사용자를 조회하면 항상 404가 났다.
    const supabase = createAdminClient()
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
    // 서버(UTC) 로컬 게터로 "이번달"을 구하면 KST 월경계와 최대 9시간 어긋나
    // 매월 1일 00:00~08:59 KST에 생성된 리드가 그 달 내내 "이번달 리드"에서
    // 누락됐다(86차 QA, KST 타임존 전수조사).
    const nowKST = getKSTNow()
    const thisMonthStart = getKSTMonthStart(nowKST.getUTCFullYear(), nowKST.getUTCMonth() + 1)

    // leads에는 user_id 컬럼이 없다(실제: assigned_to). landing_pages도
    // user_id가 아니라 created_by이며, 발행 여부는 is_published가 아니라
    // is_active + status='published' 조합으로 판단해야 한다.
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
        .eq('assigned_to', userId),
      // 이번달 리드
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .gte('created_at', thisMonthStart.toISOString()),
      // 총 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId),
      // 발행된 랜딩페이지
      supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('is_active', true)
        .eq('status', 'published'),
    ])

    // 최근 활동 조회 (5개) — company_activity_logs의 실제 컬럼명은
    // action/description/ip_address가 아니라 activity_type/activity_description이며
    // ip_address 컬럼은 존재하지 않는다.
    const { data: activities } = await supabase
      .from('company_activity_logs')
      .select(
        `
        id,
        activity_type,
        activity_description,
        metadata,
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
          action: activity.activity_type,
          description: activity.activity_description || activity.activity_type,
          metadata: activity.metadata,
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
    const adminUser = await requireSuperAdmin()

    const supabase = createAdminClient()
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

    // 비활성 사용자를 다시 활성화하는 경우, 좌석 한도(max_users)를 넘기지 않는지
    // 먼저 확인한다. 초대 수락(company_invitations→users INSERT) 시점엔 이미
    // advisory-lock 트리거로 보호되지만, "비활성화된 팀원 재활성화"는 INSERT가
    // 아니라 UPDATE라 그 트리거가 아예 발동하지 않아 전혀 검사되지 않고 있었다
    // (66차 QA 확인, 실제로 한도 초과 재현됨) - DB 트리거(다른 우회 경로까지
    // 막는 최후 방어선)를 별도로 추가했지만, 여기서도 미리 확인해 더 친절한
    // 에러 메시지를 준다.
    if (is_active === true) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('company_id, is_active')
        .eq('id', userId)
        .single()

      if (targetUser && targetUser.is_active === false) {
        const { data: sub } = await supabase
          .from('company_subscriptions')
          .select('status, current_period_end, subscription_plans!plan_id(max_users)')
          .eq('company_id', targetUser.company_id)
          .order('created_at', { ascending: false })
          .limit(10)
          .then((res: any) => {
            const rows = (res.data ?? []) as any[]
            const now = new Date().toISOString()
            const valid = rows.find(
              (r) =>
                ['active', 'trial', 'past_due'].includes(r.status) ||
                (r.status === 'cancelled' && r.current_period_end > now)
            )
            return { data: valid }
          })

        const maxUsers = sub?.subscription_plans?.max_users ?? 1
        if (maxUsers !== null) {
          const { count: activeCount } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', targetUser.company_id)
            .eq('is_active', true)

          if ((activeCount ?? 0) + 1 > maxUsers) {
            return NextResponse.json(
              { error: `좌석 한도(${maxUsers}명)를 초과합니다. 다른 팀원을 먼저 비활성화하거나 플랜을 업그레이드해주세요.` },
              { status: 409 }
            )
          }
        }
      }
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

    // 활동 로그 기록 (서비스 롤 클라이언트에는 세션이 없어 auth.getUser()를 다시
    // 호출할 수 없으므로, requireSuperAdmin()이 반환한 관리자 정보를 사용한다)
    const description = []
    if (role !== undefined) description.push(`역할을 ${role}로 변경`)
    if (is_active !== undefined)
      description.push(`상태를 ${is_active ? '활성' : '비활성'}으로 변경`)

    // company_activity_logs의 실제 컬럼명은 action/description이 아니라
    // activity_type/activity_description이다.
    const { error: activityLogError } = await supabase.from('company_activity_logs').insert({
      company_id: data.company_id,
      user_id: adminUser.id,
      activity_type: 'user_updated',
      activity_description: description.join(', '),
      metadata: { target_user_id: userId, ...updateData },
    })

    if (activityLogError) {
      console.error('Activity log insert error:', activityLogError)
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
