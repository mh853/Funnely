import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

// Create admin client with service role key
function createAdminClient() {
  return createClient<Database>(
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, password, role, hospitalId } = body

    // Validation
    if (!email || !fullName || !password || !role || !hospitalId) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // Check valid role
    const validRoles = ['hospital_admin', 'marketing_manager', 'marketing_staff', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '잘못된 권한입니다.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || '사용자 생성에 실패했습니다.' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json({ error: '사용자 생성에 실패했습니다.' }, { status: 500 })
    }

    // Create user profile
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      hospital_id: hospitalId,
      email,
      full_name: fullName,
      role,
    } as any)

    if (userError) {
      console.error('User profile creation error:', userError)
      // Rollback: Delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: '사용자 프로필 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json({
      success: true,
      message: '팀원이 초대되었습니다.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error: any) {
    console.error('Team invite error:', error)
    return NextResponse.json(
      { error: error.message || '팀원 초대 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
