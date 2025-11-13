/**
 * Signup API Route
 * Handles complete user registration with hospital creation
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, hospitalName, businessNumber } = body

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || '회원가입에 실패했습니다.' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2. Create hospital
    // Generate temporary business number if not provided
    const tempBusinessNumber = businessNumber || `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const { data: hospitalData, error: hospitalError } = await supabase
      .from('hospitals')
      .insert({
        name: hospitalName || `${fullName}의 병원`,
        business_number: tempBusinessNumber,
      })
      .select()
      .single()

    if (hospitalError) {
      console.error('Hospital creation error:', hospitalError)
      // Rollback: Delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: '병원 정보 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 3. Create user profile in public.users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      hospital_id: hospitalData.id,
      email,
      full_name: fullName,
      role: 'hospital_owner', // First user becomes hospital owner
    })

    if (userError) {
      console.error('User profile creation error:', userError)
      // Rollback: Delete hospital and auth user
      await supabase.from('hospitals').delete().eq('id', hospitalData.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: '사용자 프로필 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
