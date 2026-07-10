import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const supabase = await createClient()
    const userId = params.id

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Supabase Auth를 통해 비밀번호 재설정 이메일 발송
    // NEXT_PUBLIC_SITE_URL은 이 프로젝트에 존재하지 않는 환경변수였다(항상 undefined ->
    // "undefined/reset-password"라는 404 링크가 발송됨). 실제 쓰이는 NEXT_PUBLIC_DOMAIN을
    // 쓰고, 고객용 forgot-password 플로우(src/app/auth/forgot-password/page.tsx)와 동일하게
    // /auth/callback을 거쳐야 PKCE 세션 교환이 이뤄져 /auth/reset-password에서 실제로
    // 비밀번호를 바꿀 수 있다.
    const siteUrl = (process.env.NEXT_PUBLIC_DOMAIN || '').replace(/\/$/, '')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
      }
    )

    if (resetError) {
      console.error('Password reset error:', resetError)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    // 활동 로그 기록
    const { data: adminUser } = await supabase.auth.getUser()
    if (adminUser.user) {
      await supabase.from('company_activity_logs').insert({
        company_id: user.company_id,
        user_id: adminUser.user.id,
        action: 'password_reset_sent',
        description: `사용자 ${user.email}에게 비밀번호 재설정 이메일 발송`,
        metadata: { target_user_id: userId },
      })
    }

    return NextResponse.json({
      message: 'Password reset email sent successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
