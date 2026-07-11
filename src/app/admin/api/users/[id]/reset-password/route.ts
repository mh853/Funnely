import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/admin/permissions'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireSuperAdmin()

    // requireSuperAdmin()은 애플리케이션 레벨 체크일 뿐 세션 클라이언트의 RLS를
    // 우회하지 않는다. users RLS가 같은 회사로 스코핑되어 있어, 세션 클라이언트로는
    // 관리자가 다른 회사 소속 사용자를 조회하면 항상 404가 났다.
    const supabase = createAdminClient()
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

    // 활동 로그 기록 (서비스 롤 클라이언트에는 세션이 없어 auth.getUser()를 다시
    // 호출할 수 없으므로, requireSuperAdmin()이 반환한 관리자 정보를 사용한다.
    // company_activity_logs의 실제 컬럼명은 action/description이 아니라
    // activity_type/activity_description이다.)
    const { error: activityLogError } = await supabase.from('company_activity_logs').insert({
      company_id: user.company_id,
      user_id: adminUser.id,
      activity_type: 'password_reset_sent',
      activity_description: `사용자 ${user.email}에게 비밀번호 재설정 이메일 발송`,
      metadata: { target_user_id: userId },
    })

    if (activityLogError) {
      console.error('Activity log insert error:', activityLogError)
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
