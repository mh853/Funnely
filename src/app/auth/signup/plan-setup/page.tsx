// 가입 직후 프로 체험 여부/카드 등록 여부를 묻는 화면 (마케팅 페이지에서 프로가
// 아닌 다른 요금제를 선택해 들어온 신규가입자 전용)
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PLAN_SLUG_TO_NAME } from '@/lib/subscription/plan-slugs'
import PlanSetupClient from './PlanSetupClient'

export default async function PlanSetupPage({
  searchParams,
}: {
  searchParams: { plan?: string; billing?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const planSlug = searchParams.plan ?? ''
  const billingCycle = searchParams.billing === 'yearly' ? 'yearly' : 'monthly'
  const planName = PLAN_SLUG_TO_NAME[planSlug]

  // 알 수 없는 slug거나 프로/커스터마이징을 선택한 경우 - 이 화면이 다룰 대상이 아니므로
  // 그냥 대시보드로 보낸다(프로는 가입 API가 이미 바로 체험을 부여했고, 커스터마이징은
  // 가격이 0원인 협의 전용 플랜이라 결제 플로우 대상이 아니다).
  if (!planName || planSlug === 'pro' || planSlug === 'custom') {
    redirect('/dashboard')
  }

  const svc = createServiceClient()
  const [{ data: selectedPlan }, { data: proPlan }] = await Promise.all([
    svc
      .from('subscription_plans')
      .select('id, name, price_monthly, price_yearly')
      .eq('name', planName)
      .eq('is_active', true)
      .limit(1)
      .single(),
    svc
      .from('subscription_plans')
      .select('id')
      .eq('name', '프로')
      .eq('is_active', true)
      .limit(1)
      .single(),
  ])

  // 플랜 카탈로그에서 찾지 못하면(단종 등) 질문 없이 대시보드로 - middleware가
  // 구독이 없는 회사를 어차피 /dashboard/subscription으로 보낸다.
  if (!selectedPlan || !proPlan) {
    redirect('/dashboard')
  }

  const { data: profile } = (await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()) as { data: { company_id: string | null } | null }
  const companyId = profile?.company_id
  if (!companyId) {
    redirect('/dashboard')
  }

  // 이미 이 회사에 구독 행이 있으면(예: 뒤로가기/북마크로 이 화면에 재방문) 질문을
  // 다시 띄우지 않는다 - Q1=아니오 경로가 클라이언트에서 직접 구독 행을 INSERT하므로,
  // 서버 가드 없이 재방문/재클릭을 허용하면 active 구독이 중복 생성되어 갱신 크론이
  // 두 번 청구하게 된다.
  const { data: existingSubs } = await svc
    .from('company_subscriptions')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
  if (existingSubs && existingSubs.length > 0) {
    redirect('/dashboard')
  }

  return (
    <PlanSetupClient
      companyId={companyId}
      planSlug={planSlug}
      billingCycle={billingCycle}
      selectedPlan={selectedPlan}
      proPlanId={proPlan.id}
    />
  )
}
