import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let body: { confirmEmail?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (body.confirmEmail !== user.email) {
    return NextResponse.json({ error: '이메일이 일치하지 않습니다.' }, { status: 400 })
  }

  const { data: profile } = await db
    .from('users')
    .select('id, company_id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = adminClient as any
  const now = new Date().toISOString()

  if (profile.role === 'company_owner' || profile.role === 'hospital_owner') {
    // 활성 구독 자동 취소
    await adminDb
      .from('company_subscriptions')
      .update({ status: 'cancelled', cancelled_at: now })
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'trial'])

    // 팀원 전체 소프트 삭제
    const { data: teamMembers } = await adminDb
      .from('users')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .neq('id', user.id)

    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers as { id: string }[]) {
        await adminClient.auth.admin.deleteUser(member.id)
      }
    }

    // 회사 비활성화
    await adminDb
      .from('companies')
      .update({ is_active: false })
      .eq('id', profile.company_id)
  }

  // 활동 로그 기록 (삭제 전 보존)
  await adminDb.from('company_activity_logs').insert({
    company_id: profile.company_id,
    user_id: user.id,
    activity_type: 'account_deleted',
    activity_description: `계정 탈퇴: ${profile.full_name} (${user.email})`,
    metadata: {
      email: user.email,
      role: profile.role,
      deactivated_at: now,
      deleted_at: now,
    },
  })

  // public.users 소프트 삭제 (CASCADE로 auth 삭제 전 기록 보존)
  await adminDb
    .from('users')
    .update({ is_active: false, deactivated_at: now })
    .eq('id', user.id)

  // auth.users 하드 삭제 — 이메일이 재가입에 사용될 수 있도록 완전 제거
  // public.users는 ON DELETE CASCADE로 함께 삭제됨
  await adminClient.auth.admin.deleteUser(user.id)

  return NextResponse.json({ success: true })
}
