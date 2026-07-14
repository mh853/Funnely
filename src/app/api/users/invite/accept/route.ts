import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { pickCurrentSubscription, hasValidPlanAccess } from '@/lib/subscription-current'

// Service Role client for admin operations (bypasses RLS)
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// 초대 수락 API
export async function POST(request: Request) {
  try {
    const supabase = getServiceRoleClient()

    // Parse request body
    const body = await request.json()
    const { code, email, password, fullName } = body

    // Validate required fields
    if (!code || !email || !password || !fullName) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // Find invitation by code
    const { data: invitation, error: inviteError } = await supabase
      .from('company_invitations')
      .select('*, companies(id, name)')
      .eq('invitation_code', code)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: '유효하지 않은 초대 링크입니다.' }, { status: 404 })
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      const statusMessages: Record<string, string> = {
        accepted: '이미 수락된 초대입니다.',
        expired: '만료된 초대 링크입니다.',
        cancelled: '취소된 초대 링크입니다.',
      }
      return NextResponse.json(
        { error: statusMessages[invitation.status] || '유효하지 않은 초대입니다.' },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('company_invitations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return NextResponse.json({ error: '만료된 초대 링크입니다.' }, { status: 400 })
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
    }

    // 좌석 한도 재확인. 초대 발송 시점의 체크만으로는, 초대들이 발송된 뒤 플랜이
    // 다운그레이드되는 경우를 막지 못한다 — 그 사이에 수락되는 초대는 새(더 낮은)
    // 한도를 기준으로 다시 막아야 한다.
    const { data: subsForSeatCheck } = await supabase
      .from('company_subscriptions')
      .select('status, current_period_end, trial_end_date, cancelled_at, subscription_plans!plan_id(max_users)')
      .eq('company_id', invitation.company_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const subscription = pickCurrentSubscription(subsForSeatCheck ?? [])
    // cancelled라도 결제한 기간이 남아있으면 유효한 구독으로 인정
    const maxUsers = hasValidPlanAccess(subscription)
      ? (subscription!.subscription_plans as any)?.max_users
      : 1

    if (maxUsers !== null && maxUsers !== undefined) {
      const { count: activeUserCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', invitation.company_id)

      if ((activeUserCount || 0) >= maxUsers) {
        return NextResponse.json(
          { error: '회사의 팀원 좌석 한도에 도달해 초대를 수락할 수 없습니다. 관리자에게 문의해주세요.' },
          { status: 400 }
        )
      }
    }

    // Map simple_role to role
    const roleMap: Record<string, string> = {
      admin: 'company_admin',
      manager: 'marketing_manager',
      user: 'marketing_staff',
    }
    const mappedRole = roleMap[invitation.role] || 'marketing_staff'

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json(
        { error: '계정 생성에 실패했습니다: ' + authError.message },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 })
    }

    // Create user profile in public.users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: mappedRole,
      simple_role: invitation.role,
      company_id: invitation.company_id,
      department: invitation.department || null,
    })

    if (userError) {
      console.error('User profile creation error:', userError)

      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: '사용자 프로필 생성에 실패했습니다: ' + userError.message },
        { status: 500 }
      )
    }

    // Update invitation status to accepted — .eq('status', 'pending')로 원자적으로
    // "claim"한다. 동시에 같은 초대 코드로 두 요청이 들어오면(중복 클릭, 재시도 등)
    // 앞서 있던 단순 SELECT 체크만으로는 둘 다 통과할 수 있어 같은 초대로 계정이
    // 두 번 생성될 수 있었다. 이 UPDATE가 실제로 행에 영향을 주지 못했다면(0건),
    // 이미 다른 요청이 먼저 처리한 것이므로 방금 만든 계정을 롤백해야 한다.
    const { data: claimedInvitation, error: updateError } = await supabase
      .from('company_invitations')
      .update({
        status: 'accepted',
        accepted_by: authData.user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (updateError || !claimedInvitation) {
      console.error('Update invitation status error or lost race:', updateError)

      // 롤백: 방금 생성한 사용자 프로필과 auth 계정을 제거한다.
      await supabase.from('users').delete().eq('id', authData.user.id)
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: '이미 처리된 초대입니다. 다시 시도해주세요.' },
        { status: 409 }
      )
    }

    // companies 관계는 단일 객체로 반환되지만 타입 추론 이슈가 있어 캐스팅 필요
    const companyData = invitation.companies as unknown as { id: string; name: string } | null

    return NextResponse.json({
      message: '가입이 완료되었습니다.',
      user: {
        id: authData.user.id,
        email,
        full_name: fullName,
        role: invitation.role,
        company_name: companyData?.name,
      },
    })
  } catch (error: any) {
    console.error('Accept invitation error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 초대 정보 조회 API (코드로 조회)
export async function GET(request: Request) {
  try {
    const supabase = getServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: '초대 코드가 필요합니다.' }, { status: 400 })
    }

    // Find invitation by code
    const { data: invitation, error: inviteError } = await supabase
      .from('company_invitations')
      .select('id, role, department, status, expires_at, companies(id, name)')
      .eq('invitation_code', code)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: '유효하지 않은 초대 링크입니다.' }, { status: 404 })
    }

    // Check expiration
    const isExpired = new Date(invitation.expires_at) < new Date()

    if (invitation.status !== 'pending' || isExpired) {
      const status = isExpired ? 'expired' : invitation.status
      return NextResponse.json({
        valid: false,
        status,
        message:
          status === 'accepted'
            ? '이미 수락된 초대입니다.'
            : status === 'expired'
              ? '만료된 초대 링크입니다.'
              : status === 'cancelled'
                ? '취소된 초대 링크입니다.'
                : '유효하지 않은 초대입니다.',
      })
    }

    // companies 관계는 단일 객체로 반환되지만 타입 추론 이슈가 있어 캐스팅 필요
    const company = invitation.companies as unknown as { id: string; name: string } | null

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        role: invitation.role,
        department: invitation.department,
        expiresAt: invitation.expires_at,
        companyName: company?.name,
      },
    })
  } catch (error: any) {
    console.error('Get invitation info error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
