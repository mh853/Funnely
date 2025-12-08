import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
      .single()

    if (existingUser) {
      return NextResponse.json({ error: '이미 등록된 이메일입니다.' }, { status: 400 })
    }

    // Map simple_role to legacy role for backward compatibility
    const legacyRoleMap: Record<string, string> = {
      admin: 'hospital_admin',
      manager: 'marketing_manager',
      user: 'marketing_staff',
    }
    const legacyRole = legacyRoleMap[invitation.role] || 'marketing_staff'

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
      role: legacyRole,
      simple_role: invitation.role,
      company_id: invitation.company_id,
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

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from('company_invitations')
      .update({
        status: 'accepted',
        accepted_by: authData.user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Update invitation status error:', updateError)
      // Non-critical error, don't fail the request
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
      .select('id, role, status, expires_at, companies(id, name)')
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
        expiresAt: invitation.expires_at,
        companyName: company?.name,
      },
    })
  } catch (error: any) {
    console.error('Get invitation info error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
