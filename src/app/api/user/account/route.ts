import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revokeBillingKey } from '@/lib/payments/revoke-billing-key'

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
    // 마지막 관리자 보호: 회사에 owner가 여러 명일 수 있다(기존 owner가 팀원을
    // 공동 owner로 승격 가능 - /api/users/[id]route.ts 참고). 다른 owner가 남아있는데도
    // 무조건 회사 전체를 정리하면, 공동 owner 중 한 명이 개인적으로 탈퇴한 것만으로
    // 나머지 owner·팀원의 구독/데이터 접근이 동의 없이 전부 끊긴다(68차 QA 확인).
    // 본인 탈퇴로 인한 회사 전체 정리는 "내가 마지막 owner일 때"로 한정한다.
    const { count: otherOwnerCount, error: ownerCountError } = await db
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .in('role', ['company_owner', 'hospital_owner'])
      .neq('id', user.id)

    if (ownerCountError) {
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }

    if (!otherOwnerCount) {
      // 활성 구독 자동 취소 - past_due(결제실패 유예기간)도 포함해야 한다.
      // 빠지면 취소 표시 없이 상태가 영원히 past_due로 남아 취소가 아니라
      // 결제실패로 보인다(80차 QA 확인, 실제 청구 위험은 companies.is_active=false로
      // 이미 차단됨).
      // Toss에 등록된 빌링키(카드)는 취소 후에도 별도로 해지하지 않으면 Toss
      // 서버에 결제 가능한 상태로 무기한 남는다(83차 QA) - 취소 전에 대상
      // billing_key들을 먼저 확보해둔다. 계정탈퇴는 되돌릴 방법이 없으므로
      // (구독 취소와 달리) 즉시 해지해도 재개 흐름과 충돌하지 않는다.
      const { data: subsToCancel } = await adminDb
        .from('company_subscriptions')
        .select('id, billing_key')
        .eq('company_id', profile.company_id)
        .in('status', ['active', 'trial', 'past_due'])

      const { error: cancelSubError } = await adminDb
        .from('company_subscriptions')
        .update({ status: 'cancelled', cancelled_at: now })
        .eq('company_id', profile.company_id)
        .in('status', ['active', 'trial', 'past_due'])
      if (cancelSubError) {
        console.error('Account deletion - subscription cancel failed:', cancelSubError)
      } else {
        const billingKeys = Array.from(
          new Set((subsToCancel || []).map((s: any) => s.billing_key).filter(Boolean))
        ) as string[]
        await Promise.all(billingKeys.map((key) => revokeBillingKey(key)))
      }

      // 팀원 전체 소프트 삭제 - 이 주석대로 소프트 삭제를 의도했으나 실제로는
      // auth.admin.deleteUser(하드삭제)를 호출하고 있었다. 팀원이 담당 리드를 갖고
      // 있으면(assigned_to 등이 users.id를 ON DELETE NO ACTION으로 참조) 하드삭제가
      // FK 제약으로 항상 실패하는데 반환값을 확인하지 않아 실패가 조용히 은폐되고
      // 팀원 로그인 자격증명이 그대로 살아남았다(49차 QA 라이브 재현). UI가 실제로
      // 약속하는 "비활성화"에 맞춰 소프트 삭제로 바꾼다.
      await adminDb
        .from('users')
        .update({ is_active: false, deactivated_at: now })
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .neq('id', user.id)

      // 회사 비활성화 - withdrawn_at을 채우지 않으면 관리자 화면(admin/companies)이
      // "탈퇴"가 아니라 "비활성"으로만 표시하고, 이탈(churn) 집계 쿼리들이 전부
      // withdrawn_at 기준이라 이 탈퇴가 누락된다(80차 QA 확인).
      const { error: deactivateCompanyError } = await adminDb
        .from('companies')
        .update({ is_active: false, withdrawn_at: now })
        .eq('id', profile.company_id)
      if (deactivateCompanyError) {
        console.error('Account deletion - company deactivation failed:', deactivateCompanyError)
      }
    }
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
  // public.users는 ON DELETE CASCADE로 함께 삭제됨. lead_notes/calendar_events 등
  // 본인이 남긴 기록이 있으면 그 테이블들의 ON DELETE NO ACTION 제약으로 실패할 수
  // 있는데, 에러를 확인하지 않아 조용히 은폐됐다(71차 QA) - 바로 위에서 이미
  // is_active=false 처리해 로그인 후 데이터 접근은 막히지만, 이메일이 계속 "사용 중"으로
  // 남아 재가입이 막히는 문제를 진단할 수 있도록 로그는 남긴다.
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteAuthError) {
    console.error('Account deletion - auth user delete failed:', deleteAuthError)
  }

  return NextResponse.json({ success: true })
}
