/**
 * Signup API Route
 * Handles complete user registration with company creation
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, companyName, businessNumber, phone } = body

    // Validation
    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름, 회사명은 필수입니다.' },
        { status: 400 }
      )
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: '이메일 정보를 확인해주세요.' },
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
      const msg = authError.message?.toLowerCase() ?? ''
      let koreanError = '회원가입에 실패했습니다.'
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('already exists')) {
        koreanError = '이미 가입된 이메일 주소입니다.'
      } else if (msg.includes('invalid email') || msg.includes('email address') || msg.includes('unable to validate')) {
        koreanError = '이메일 정보를 확인해주세요.'
      } else if (msg.includes('password')) {
        koreanError = '비밀번호 형식을 확인해주세요.'
      }
      return NextResponse.json({ error: koreanError }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2. Create company
    // Generate temporary business number if not provided
    const tempBusinessNumber = businessNumber || `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName || `${fullName}의 회사`,
        business_number: tempBusinessNumber,
      } as any)
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError.message, companyError.details, companyError.hint)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `회사 정보 생성에 실패했습니다. (${companyError.message})` },
        { status: 500 }
      )
    }

    // 3. Create user profile in public.users
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      company_id: (companyData as any).id,
      email,
      full_name: fullName,
      role: 'company_owner',
      ...(phone ? { phone } : {}),
    } as any)

    if (userError) {
      console.error('User profile creation error:', userError)
      // Rollback: Delete company and auth user
      await supabase.from('companies').delete().eq('id', (companyData as any).id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: '사용자 프로필 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 4. 프리미엄 플랜 7일 무료체험 자동 부여
    const { data: proPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', '프리미엄')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (proPlan) {
      const now = new Date()
      const trialEnd = new Date(now)
      trialEnd.setDate(trialEnd.getDate() + 7)

      const { error: subError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: (companyData as any).id,
          plan_id: proPlan.id,
          status: 'trial',
          billing_cycle: 'monthly',
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          has_used_trial: true,
        } as any)

      if (subError) {
        console.error('Trial subscription creation error:', subError)
      }
    } else {
      console.error('프리미엄 플랜을 찾을 수 없습니다. subscription_plans 테이블을 확인하세요.')
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
