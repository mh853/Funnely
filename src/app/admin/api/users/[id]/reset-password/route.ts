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
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
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
