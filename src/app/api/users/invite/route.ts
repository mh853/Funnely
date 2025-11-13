import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    // Get current user's profile to check permissions and hospital_id
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('hospital_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Check if user has permission to invite (hospital_owner or hospital_admin)
    if (!['hospital_owner', 'hospital_admin'].includes(currentUserProfile.role)) {
      return NextResponse.json({ error: '팀원을 초대할 권한이 없습니다.' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { email, fullName, role, password } = body

    // Validate required fields
    if (!email || !fullName || !role || !password) {
      return NextResponse.json({ error: '필수 항목을 모두 입력해주세요.' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['marketing_staff', 'marketing_manager', 'hospital_admin', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '유효하지 않은 권한입니다.' }, { status: 400 })
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

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      return NextResponse.json({ error: '사용자 생성에 실패했습니다: ' + authError.message }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: '사용자 생성에 실패했습니다.' }, { status: 500 })
    }

    // Create user profile in public.users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      hospital_id: currentUserProfile.hospital_id,
    })

    if (userError) {
      console.error('User profile creation error:', userError)

      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json({ error: '사용자 프로필 생성에 실패했습니다: ' + userError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: '팀원 초대가 완료되었습니다.',
      user: {
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
      },
    })
  } catch (error: any) {
    console.error('Invite user error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
