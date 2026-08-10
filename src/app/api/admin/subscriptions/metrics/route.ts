import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { requirePermission } from '@/lib/admin/rbac-middleware'
import { PERMISSIONS } from '@/types/rbac'
import { pickCurrentSubscription } from '@/lib/subscription-current'
import { getKSTNow, getKSTMonthStart } from '@/lib/utils/date'

export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 권한 확인
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    if (!adminUser.profile.is_super_admin) {
      await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_COMPANIES)
    }

    // 3. Supabase 클라이언트 생성
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    // 서버(UTC) 로컬 게터로 "이번달"을 구하면 KST 월경계와 최대 9시간 어긋나
    // 매월 1일 00:00~08:59 KST의 결제가 그 달 내내 "이번달 결제"에서 누락됐다
    // (86차 QA, KST 타임존 전수조사).
    const nowKST = getKSTNow()
    const currentYear = nowKST.getUTCFullYear()
    const currentMonth = nowKST.getUTCMonth() + 1

    // 4. 모든 구독 조회 (plan 정보 포함)
    // subscription_plans!plan_id: company_subscriptions는 plan_id/pending_plan_id 두 개의
    // FK가 subscription_plans를 가리키므로, 모호성 해소를 위해 컬럼명을 명시해야 한다
    // (그냥 subscription_plans!inner로 쓰면 PGRST201/HTTP 300 에러가 발생한다).
    // 8번(이번 달 결제 내역)은 이 쿼리 결과와 무관하므로 병렬로 함께 실행한다.
    const [
      { data: subscriptions, error: subsError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from('company_subscriptions')
        .select(`
          id,
          company_id,
          plan_id,
          status,
          billing_cycle,
          current_period_start,
          current_period_end,
          trial_end_date,
          cancelled_at,
          created_at,
          locked_plan_id,
          locked_price_monthly,
          locked_price_yearly,
          subscription_plans!plan_id (
            id,
            name,
            price_monthly,
            price_yearly
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_transactions')
        .select('total_amount, approved_at, status')
        .eq('status', 'success')
        .gte('approved_at', getKSTMonthStart(currentYear, currentMonth).toISOString())
        .lt('approved_at', getKSTMonthStart(currentYear, currentMonth + 1).toISOString()),
    ])

    if (subsError) {
      console.error('[Billing Metrics] Error fetching subscriptions:', subsError)
      throw subsError
    }
    if (paymentsError) {
      console.error('[Billing Metrics] Error fetching payments:', paymentsError)
    }

    // company_subscriptions는 회사가 플랜을 바꾸거나 재구독할 때마다 새 행이 쌓이는
    // 이력 테이블이다. 회사당 "진짜 현재 구독" 1건만 집계 대상으로 삼아야 한다.
    // 단순히 created_at 기준 최신 행을 고르면(과거 방식), 플랜 변경/재구독 이력이
    // 쌓인 회사는 실제 유효한 구독이 아니라 그보다 나중에 생성된 만료/취소 행이
    // 뽑혀 MRR·상태분포·플랜분포가 실제와 다르게 집계될 수 있다(60차 QA 확인) -
    // pickCurrentSubscription과 동일한 우선순위(유효한 active > 유효한 trial >
    // past_due > 최근 취소 > 나머지 최신)로 골라야 middleware/대시보드가 인정하는
    // "현재 구독"과 일치한다.
    const subsByCompany = new Map<string, NonNullable<typeof subscriptions>>()
    for (const sub of subscriptions || []) {
      const list = subsByCompany.get(sub.company_id)
      if (list) list.push(sub)
      else subsByCompany.set(sub.company_id, [sub])
    }
    const latestSubscriptions = Array.from(subsByCompany.values())
      .map(subs => pickCurrentSubscription(subs))
      .filter((sub): sub is NonNullable<typeof sub> => sub !== null)

    // 5. 활성 구독 필터링 (active, trial, past_due) + 기간종료형 취소(cancelled지만
    // current_period_end가 아직 안 지나 이번 기간은 이미 결제완료·이용중인 경우)도
    // 포함한다 - hasValidPlanAccess(subscription-current.ts)의 cancelled 판정과
    // 동일 기준. 이게 빠져있으면 이번 달 취소한 유료고객의 매출이 MRR에서 누락되어
    // 실제보다 낮게 표시됐다(83차 QA).
    const nowIso = now.toISOString()
    const activeStatuses = ['active', 'trial', 'past_due']
    const activeSubscriptions = latestSubscriptions.filter(sub =>
      activeStatuses.includes(sub.status) ||
      (sub.status === 'cancelled' && sub.current_period_end !== null && sub.current_period_end > nowIso)
    )

    // 6. MRR 계산 (Monthly Recurring Revenue)
    // 그랜드파더링(61차) 중인 구독은 실제로 카탈로그 최신가가 아니라 locked_price_*로
    // 청구된다 - 여기서 카탈로그가만 쓰면 관리자가 보는 MRR/ARR이 실제 매출과
    // 어긋나고, daily-tasks가 매일 이 값을 revenue_metrics에 그대로 저장해 추이
    // 차트까지 소급 오염된다(63차 QA 확인).
    let mrr = 0
    activeSubscriptions.forEach(sub => {
      const s = sub as any
      const plan = s.subscription_plans
      const priceLockValid =
        s.locked_plan_id === s.plan_id &&
        s.locked_price_monthly !== null &&
        s.locked_price_yearly !== null
      const monthlyPrice = priceLockValid ? s.locked_price_monthly : plan?.price_monthly
      const yearlyPrice = priceLockValid ? s.locked_price_yearly : plan?.price_yearly
      if (sub.billing_cycle === 'monthly' && monthlyPrice) {
        mrr += Number(monthlyPrice)
      } else if (sub.billing_cycle === 'yearly' && yearlyPrice) {
        mrr += Number(yearlyPrice) / 12 // 연간 금액을 월 단위로 환산
      }
    })

    // 7. ARR 계산 (Annual Recurring Revenue)
    const arr = mrr * 12

    // 8. 이번 달 실제 매출 (성공한 결제 내역 기준, 위 Promise.all에서 함께 조회함)
    // 'payment_history'는 존재하지 않는 테이블이며, 실제 결제 내역은 payment_transactions에
    // 저장된다. 날짜 컬럼도 'payment_date'가 아니라 'approved_at'이다.
    const monthlyRevenue = (payments || []).reduce(
      (sum, payment) => sum + (payment.total_amount || 0),
      0
    )

    // 9. 상태별 분포 (회사당 최신 구독 1건 기준)
    const statusDistribution: Record<string, number> = {}
    latestSubscriptions.forEach(sub => {
      const status = sub.status || 'unknown'
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
    })

    // 10. 플랜별 분포 (회사당 최신 구독 1건 기준)
    // 2026-04-30 요금제 카탈로그 개편(한글 플랜명 전면 도입) 이전에 가입해 그랜드파더링
    // 가격을 유지 중인 구독은 subscription_plans.name이 옛 영문명("Pro" 등)으로 남아있어,
    // 신규 플랜(한글 "프로")과 별개 항목으로 집계되는 문제가 있었다(64차 QA 확인).
    // 확인된 범위(현재 활성 구독이 실제로 가리키는 옛 이름)만 정규화하고, 그 외 레거시
    // 카탈로그(Enterprise/Business/Personal 등)는 현재 어떤 신규 플랜과 대응되는지가
    // 순수 데이터로 판단할 수 없는 비즈니스 의사결정 영역이라 임의로 매핑하지 않는다.
    const LEGACY_PLAN_NAME_ALIASES: Record<string, string> = {
      Pro: '프로',
    }
    const planDistribution: Record<string, number> = {}
    latestSubscriptions.forEach(sub => {
      const rawPlan = (sub as any).subscription_plans?.name || 'unknown'
      const plan = LEGACY_PLAN_NAME_ALIASES[rawPlan] || rawPlan
      planDistribution[plan] = (planDistribution[plan] || 0) + 1
    })

    // 11. 응답 반환
    return NextResponse.json({
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      monthlyRevenue: Math.round(monthlyRevenue),
      activeSubscriptions: activeSubscriptions.length,
      statusDistribution,
      planDistribution,
    })
  } catch (error) {
    console.error('[Billing Metrics] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch billing metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
