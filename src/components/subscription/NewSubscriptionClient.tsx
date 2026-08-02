'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { useToast } from '@/components/shared/Toast'
import { hasValidPlanAccess } from '@/lib/subscription-current'

interface Plan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: any
  max_users: number | null
  max_landing_pages: number | null
  sort_order: number
}

interface CurrentSubscription {
  id: string
  status: string
  billing_cycle: string
  trial_end_date: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
  has_used_trial: boolean
  billing_key: string | null
  pending_plan_id: string | null
  pending_billing_cycle: string | null
  subscription_plans: Plan
}

interface CardInfo {
  number?: string
  cardType?: string
  ownerType?: string
}

interface NewSubscriptionClientProps {
  plans: Plan[]
  currentSubscription: CurrentSubscription | null
  companyId: string
  companyBillingKeySubscriptionId?: string | null
  companyCardInfo?: CardInfo | null
}

function formatFeatures(plan: Plan): string[] {
  const features: string[] = []

  if (plan.max_landing_pages) {
    features.push(`랜딩페이지 ${plan.max_landing_pages}개`)
  } else if (plan.max_landing_pages === null) {
    features.push('랜딩페이지 무제한')
  }

  if (plan.max_users) {
    features.push(`관리자 ${plan.max_users}명`)
  } else if (plan.max_users === null) {
    features.push('관리자 무제한')
  }

  if (plan.features && typeof plan.features === 'object') {
    const featureLabels: { [key: string]: string } = {
      dashboard: '대시보드',
      db_status: 'DB 현황',
      db_schedule: 'DB 스케줄',
      reservation_schedule: '예약 스케줄',
      advanced_schedule: '스케줄 관리 기능',
      analytics: '분석',
      reports: '리포트',
      priority_support: '우선 지원',
      customization: '커스터마이징',
      custom_integration: '커스텀 통합',
    }

    Object.entries(plan.features).forEach(([key, value]) => {
      if (value === true && featureLabels[key]) {
        features.push(featureLabels[key])
      }
    })
  }

  return features
}

export default function NewSubscriptionClient({
  plans,
  currentSubscription,
  companyId,
  companyBillingKeySubscriptionId,
  companyCardInfo,
}: NewSubscriptionClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ accessUntil: string | null } | null>(null)
  const [cancelPendingLoading, setCancelPendingLoading] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{
    plan: Plan
    proratedNet: number
    proratedTotal: number
    remainingDays: number
    isCycleChange: boolean
  } | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [cardChanging, setCardChanging] = useState(false)
  const cancelModalRef = useRef<HTMLDivElement>(null)
  const upgradeModalRef = useRef<HTMLDivElement>(null)

  // 손수 만든 모달들이 role/포커스 트랩 없이 배경 클릭으로만 닫히던 것을 보완:
  // Tab을 모달 안에서 순환시키고 Escape로 닫는다.
  const trapModalTab = (
    e: React.KeyboardEvent<HTMLDivElement>,
    panelRef: React.RefObject<HTMLDivElement>,
    close: () => void
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key !== 'Tab') return
    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  useEffect(() => {
    if (cancelModalOpen) {
      cancelModalRef.current?.querySelector<HTMLElement>('button')?.focus()
    }
  }, [cancelModalOpen])

  useEffect(() => {
    if (upgradeModal) {
      upgradeModalRef.current?.querySelector<HTMLElement>('button')?.focus()
    }
  }, [upgradeModal])

  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order)

  // 다운그레이드 예약 안내에 표시할 변경 예정 플랜명
  const pendingPlanName = currentSubscription?.pending_plan_id
    ? plans.find((p) => p.id === currentSubscription.pending_plan_id)?.name
    : null

  // 현재 Free 플랜인지
  const isOnFreePlan =
    currentSubscription?.status === 'active' &&
    currentSubscription?.subscription_plans?.name === 'Free'

  // 현재 유료 플랜 활성 상태인지
  const isActivePaidUser = currentSubscription?.status === 'active' && !isOnFreePlan

  // 기존 사용자 여부: 체험 이력, trial 중, 만료/취소, 또는 현재 유료 플랜 이용 중
  const hasUsedTrial = currentSubscription?.has_used_trial === true
  const isCurrentlyOnTrial = currentSubscription?.status === 'trial'
  // suspended(관리자 정지)도 포함 - 안 그러면 정지 해제된 회사가 기존 빌링키로
  // 재구독하는 경로가 없어 hasBillingKey여도 아래쪽 "구독 자체가 새로 생기는" 분기로
  // 잘못 빠진다(59차 QA 확인, High)
  const hasPreviousSubscription = ['expired', 'cancelled', 'canceled', 'past_due', 'suspended'].includes(
    currentSubscription?.status ?? ''
  )
  const isExistingUser = hasUsedTrial || isCurrentlyOnTrial || hasPreviousSubscription || isActivePaidUser

  // 취소했지만 이미 결제한 기간이 아직 남아있는 상태 - 새로 결제하지 않고 취소만
  // 되돌리는 "재구독"이 가능하다 (다른 플랜으로 바꾸는 것과는 다른 흐름)
  const isCancelledWithValidAccess =
    currentSubscription?.status === 'cancelled' &&
    currentSubscription?.current_period_end !== null &&
    currentSubscription.current_period_end > new Date().toISOString()

  // 관리자가 정지(suspended)했지만 이미 결제한 기간이 아직 남아있는 상태 - suspended를
  // hasPreviousSubscription에 포함시키면서(59차 QA) 아무 조건 없이 두면 같은 플랜을
  // 다시 고를 때 convert-trial 경로(즉시 실제 결제)로 빠져 이미 결제한 기간을 이중
  // 청구하게 된다 - cancelled와 동일하게 새로 결제하지 않는 별도 흐름이 필요하다.
  const isSuspendedWithValidAccess =
    currentSubscription?.status === 'suspended' &&
    currentSubscription?.current_period_end !== null &&
    currentSubscription.current_period_end > new Date().toISOString()

  // 결제 실패로 유예기간(past_due) 중인 상태 - trial/cancelled와 동일하게 자신의 현재
  // 플랜 버튼이 disabled로 잠겨 있으면 카드 문제를 해결한 뒤에도 스스로 재결제를 시도할
  // 방법이 없다(56차 QA 확인: handleSelectPlan의 재결제 분기는 이미 구현돼 있었으나
  // 정작 그 분기로 가는 버튼만 막혀 있었음)
  const isPastDue = currentSubscription?.status === 'past_due'

  // isCurrentPlan은 plan_id가 이 플랜과 같기만 하면 true가 되는데, "카드 등록 후 즉시
  // 결제"(isExistingUser 분기)가 plan_id를 낙관적으로 먼저 커밋한 뒤 카드등록(Step1)만
  // 성공하고 즉시결제(Step2)가 중단되면 - 실제로는 만료(expired)/기간이 이미 지난
  // 취소·정지 상태라 아무 접근권한이 없는데도 isCancelledWithValidAccess/
  // isSuspendedWithValidAccess/isPastDue 중 어느 조건에도 안 걸려 canReactivate가
  // 전부 false가 되고, 버튼이 "현재 사용 중"으로 영구 비활성화되는 데드엔드가
  // 생겼다(61차 QA 확인, High). 개별 상태값을 하나씩 열거하는 대신 hasValidPlanAccess로
  // "지금 실제로 이 플랜을 쓸 권한이 있는가"를 직접 물어, 위 세 조건이 놓친 조합
  // (expired, 또는 기간이 지난 cancelled/suspended)까지 전부 포괄한다.
  const isCurrentPlanUnpaid =
    !!currentSubscription && !isCurrentlyOnTrial && !hasValidPlanAccess(currentSubscription)

  // 빌링키 등록 여부: 현재 구독 또는 회사 다른 구독에 빌링키가 있으면 재사용 가능
  const hasBillingKey = !!currentSubscription?.billing_key || !!companyBillingKeySubscriptionId

  // Realtime 구독 상태 변경 감지
  useEffect(() => {
    if (!companyId) return

    const supabase = createClient()

    const channel = supabase
      .channel('user-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_subscriptions',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, router])

  // 업그레이드 차액 예상 금액 계산 (UI 표시용 — 실제 청구는 서버에서 계산)
  const estimateUpgradeAmount = (plan: Plan) => {
    const isCycleChange = billingCycle !== (currentSubscription?.billing_cycle ?? billingCycle)
    const newPrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly

    if (
      !isCycleChange &&
      currentSubscription?.current_period_start &&
      currentSubscription?.current_period_end
    ) {
      const now = new Date()
      const periodStart = new Date(currentSubscription.current_period_start)
      const periodEnd = new Date(currentSubscription.current_period_end)
      const totalPeriodDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime())
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
      const oldPrice =
        currentSubscription.billing_cycle === 'monthly'
          ? currentSubscription.subscription_plans.price_monthly
          : currentSubscription.subscription_plans.price_yearly
      const proratedNet = Math.max(
        0,
        Math.round((newPrice - oldPrice) * (remainingDays / totalPeriodDays))
      )
      return {
        proratedNet,
        proratedTotal: proratedNet + Math.floor(proratedNet * 0.1),
        remainingDays,
        isCycleChange: false,
      }
    }

    // 주기 변경 또는 기간 정보 없음: 새 주기 전체 금액
    return {
      proratedNet: newPrice,
      proratedTotal: newPrice + Math.floor(newPrice * 0.1),
      remainingDays: 0,
      isCycleChange,
    }
  }

  const handleUpgradeConfirm = async () => {
    if (!upgradeModal || !currentSubscription) return
    setUpgradeLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('로그인이 필요합니다.')

      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const res = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: currentSubscription.id,
          mode: 'upgrade_prorate',
          changePlanId: upgradeModal.plan.id,
          changeBillingCycle: billingCycle,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '업그레이드 결제에 실패했습니다.')
      }
      setUpgradeModal(null)
      toast.success(`${upgradeModal.plan.name} 플랜으로 업그레이드되었습니다.`)
      router.refresh()
    } catch (error: any) {
      toast.error(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setUpgradeLoading(false)
    }
  }

  const handleSelectPlan = async (plan: Plan) => {
    // 가격 협의 플랜
    if (plan.price_monthly === 0 && plan.price_yearly === 0) {
      toast.error('대규모 조직을 위한 플랜은 별도 문의가 필요합니다. 고객센터로 연락해주세요.')
      return
    }

    setSelectedPlan(plan)
    setLoading(true)

    try {
      const supabase = createClient()
      const isFree = plan.name === 'Free' && plan.price_monthly === 0

      if (currentSubscription) {
        const isSamePlanAndCycle =
          currentSubscription.subscription_plans.id === plan.id &&
          currentSubscription.billing_cycle === billingCycle

        if (
          (isCancelledWithValidAccess || isSuspendedWithValidAccess) &&
          isSamePlanAndCycle
        ) {
          // 재구독: 이미 결제한 기간이 남아있으므로 새로 결제하지 않고 취소/정지만 되돌린다
          const res = await fetch('/api/subscription/reactivate', { method: 'POST' })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || '재구독에 실패했습니다.')
          }
          toast.success('구독이 재개되었습니다.')
          router.refresh()
        } else if (hasBillingKey && (isCurrentlyOnTrial || hasPreviousSubscription)) {
          // 체험 중 또는 만료/취소/결제지연 + 빌링키 있음: 서버 API로 빌링키 복사 + 상태 전환 + 결제 처리
          const res = await fetch('/api/subscription/convert-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId: currentSubscription.id,
              planId: plan.id,
              billingCycle,
              // 현재 구독에 빌링키 없으면 다른 구독의 빌링키 사용
              billingKeySubscriptionId: currentSubscription.billing_key
                ? undefined
                : companyBillingKeySubscriptionId,
            }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || '결제에 실패했습니다.')
          }
          toast.success(`${plan.name} 플랜 결제가 완료되었습니다.\n지금부터 구독이 시작됩니다.`)
          router.refresh()
        } else if (isFree) {
          // Free 플랜으로 다운그레이드: 즉시 적용, 기간 없음.
          // 유료 플랜 간 다운그레이드는 다음 결제일까지 유예되지만, Free 전환은
          // 즉시 적용되면서도 한도 초과 여부를 전혀 알려주지 않았다. 기존 데이터를
          // 지우지는 않지만(생성만 막힘), 적용 전에 초과 현황을 알려준다.
          const [{ count: landingPageCount }, { count: userCount }] = await Promise.all([
            supabase
              .from('landing_pages')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', companyId),
            supabase
              .from('users')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', companyId),
          ])

          const overLimitMessages: string[] = []
          if (plan.max_landing_pages !== null && (landingPageCount || 0) > plan.max_landing_pages) {
            overLimitMessages.push(
              `랜딩페이지 ${landingPageCount}개 보유 중 (Free 플랜은 ${plan.max_landing_pages}개까지)`
            )
          }
          if (plan.max_users !== null && (userCount || 0) > plan.max_users) {
            overLimitMessages.push(`팀원 ${userCount}명 보유 중 (Free 플랜은 ${plan.max_users}명까지)`)
          }

          if (overLimitMessages.length > 0) {
            const confirmed = confirm(
              `현재 사용량이 Free 플랜 한도를 초과합니다.\n- ${overLimitMessages.join('\n- ')}\n\n` +
                `기존 데이터는 삭제되지 않지만, 한도 아래로 줄이기 전까지 새 항목을 추가할 수 없습니다.\n\n계속하시겠습니까?`
            )
            if (!confirmed) return
          }

          const { error } = await supabase
            .from('company_subscriptions')
            .update({
              plan_id: plan.id,
              status: 'active',
              billing_cycle: 'monthly',
              current_period_start: null,
              current_period_end: null,
              trial_start_date: null,
              trial_end_date: null,
              // 예약된 다운그레이드가 남아있으면 이후 결제(갱신/체험전환)가
              // 방금 선택한 Free가 아니라 예전 예약 플랜 가격으로 청구되므로 함께 비운다.
              pending_plan_id: null,
              pending_billing_cycle: null,
            })
            .eq('id', currentSubscription.id)

          if (error) throw new Error(error.message)

          toast.success('Free 플랜으로 변경되었습니다.')
          router.refresh()
        } else if (isActivePaidUser && hasBillingKey) {
          // 유료 구독 중 + 빌링키 있음: 업그레이드/다운그레이드 분기
          // 월 단가로 정규화하여 비교 (연간 주기도 올바르게 처리)
          const currentMonthlyEquiv =
            currentSubscription.billing_cycle === 'monthly'
              ? currentSubscription.subscription_plans.price_monthly
              : Math.round(currentSubscription.subscription_plans.price_yearly / 12)
          const newMonthlyEquiv =
            billingCycle === 'monthly'
              ? plan.price_monthly
              : Math.round(plan.price_yearly / 12)

          if (newMonthlyEquiv > currentMonthlyEquiv) {
            // 업그레이드: 차액 즉시 청구 → 모달에서 확인 후 결제
            const estimate = estimateUpgradeAmount(plan)
            setUpgradeModal({ plan, ...estimate })
            return
          } else if (newMonthlyEquiv < currentMonthlyEquiv) {
            // 다운그레이드: 다음 결제 주기에 적용
            const periodEnd = currentSubscription.current_period_end
            const periodEndLabel = periodEnd ? formatDate(periodEnd) : '다음 결제일'
            const confirmed = confirm(
              `다음 결제일(${periodEndLabel})부터 ${plan.name} 플랜으로 변경됩니다.\n그 전까지 현재 플랜의 모든 기능을 이용하실 수 있습니다.\n\n다운그레이드를 예약하시겠습니까?`
            )
            if (!confirmed) return

            const {
              data: { session },
            } = await supabase.auth.getSession()
            if (!session) throw new Error('로그인이 필요합니다.')

            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const res = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscriptionId: currentSubscription.id,
                mode: 'downgrade_defer',
                changePlanId: plan.id,
                changeBillingCycle: billingCycle,
              }),
            })
            if (!res.ok) {
              const err = await res.json()
              throw new Error(err.error || '플랜 변경 예약에 실패했습니다.')
            }
            toast.success(`${periodEndLabel}부터 ${plan.name} 플랜으로 변경됩니다.`)
            router.refresh()
          } else {
            // 같은 가격 티어 (주기 변경 등): 업그레이드와 동일하게 처리
            const estimate = estimateUpgradeAmount(plan)
            setUpgradeModal({ plan, ...estimate })
            return
          }
        } else if (isExistingUser) {
          // 기존 사용자 (빌링키 없음 또는 trial/만료): 카드 등록 후 즉시 결제
          // 선택한 플랜/주기를 구독에 미리 저장
          // 예약된 다운그레이드가 남아있으면 곧이어 진행되는 결제(billing-success의
          // mode 없는 분기)가 방금 고른 플랜이 아니라 예전 예약 플랜 가격으로 청구되므로 함께 비운다.
          //
          // 카드 등록 팝업(requestBillingAuth) 호출 전에 plan_id를 먼저 커밋하는데,
          // 사용자가 팝업을 닫거나 카드가 거절되면(billing-fail로 이동) 이 커밋을
          // 되돌리는 코드가 없어 결제 이력 없이 유료 플랜만 영구 활성화됐다(59차 QA
          // 확인, Critical). failUrl에 원래 값을 실어 보내 billing-fail 페이지가
          // 되돌릴 수 있게 한다.
          const originalPlanId = currentSubscription.subscription_plans.id
          const originalBillingCycle = currentSubscription.billing_cycle

          const { error: updateError } = await supabase
            .from('company_subscriptions')
            .update({
              plan_id: plan.id,
              billing_cycle: billingCycle,
              pending_plan_id: null,
              pending_billing_cycle: null,
            })
            .eq('id', currentSubscription.id)

          if (updateError) throw new Error(updateError.message)

          // 빌링키 없음 → 카드 등록 후 즉시 결제
          const tossPayments = await loadTossPayments(
            process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
          )
          const failParams = new URLSearchParams({
            subscriptionId: currentSubscription.id,
            originalPlanId,
            originalBillingCycle,
          })
          await tossPayments.requestBillingAuth('카드', {
            customerKey: companyId,
            successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${currentSubscription.id}`,
            failUrl: `${window.location.origin}/dashboard/subscription/billing-fail?${failParams}`,
          })
          // requestBillingAuth는 페이지를 리다이렉트하므로 이후 코드는 실행되지 않음
          return
        } else if (plan.name === '프로') {
          // 신규 사용자 + 프로 플랜 → 7일 무료 체험 시작
          const res = await fetch('/api/subscription/start-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptionId: currentSubscription.id,
              planId: plan.id,
              billingCycle,
            }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || '무료 체험 시작에 실패했습니다.')

          toast.success('7일 무료 체험이 시작되었습니다!\n체험 기간이 끝나면 서비스 접근이 제한되니, 계속 이용하시려면 플랜을 선택해주세요.')
          router.refresh()
        } else {
          // 신규 사용자 + 기타 유료 플랜 → 카드 등록 후 즉시 결제
          // 카드 등록 실패/취소 시 되돌릴 수 있도록 원래 값을 failUrl에 실어 보낸다
          // (59차 QA 확인, Critical - 위 isExistingUser 분기와 동일한 이유)
          const originalPlanId = currentSubscription.subscription_plans.id
          const originalBillingCycle = currentSubscription.billing_cycle

          const { error: updateError } = await supabase
            .from('company_subscriptions')
            .update({ plan_id: plan.id, billing_cycle: billingCycle })
            .eq('id', currentSubscription.id)

          if (updateError) throw new Error(updateError.message)

          const tossPayments = await loadTossPayments(
            process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
          )
          const failParams = new URLSearchParams({
            subscriptionId: currentSubscription.id,
            originalPlanId,
            originalBillingCycle,
          })
          await tossPayments.requestBillingAuth('카드', {
            customerKey: companyId,
            successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${currentSubscription.id}`,
            failUrl: `${window.location.origin}/dashboard/subscription/billing-fail?${failParams}`,
          })
        }
      } else {
        // 구독 자체가 없는 경우 (예외 - 보통 회원가입 시 구독이 생성됨)
        if (isFree) {
          const { error } = await supabase
            .from('company_subscriptions')
            .insert({
              company_id: companyId,
              plan_id: plan.id,
              status: 'active',
              billing_cycle: 'monthly',
            })
          if (error) throw new Error(error.message)
          router.refresh()
        } else if (plan.name === '프로') {
          // 프로 플랜 무료 체험
          const res = await fetch('/api/subscription/start-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: plan.id, billingCycle, companyId }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || '무료 체험 시작에 실패했습니다.')
          toast.success('7일 무료 체험이 시작되었습니다!\n체험 기간이 끝나면 서비스 접근이 제한되니, 계속 이용하시려면 플랜을 선택해주세요.')
          router.refresh()
        } else {
          // 기타 유료 플랜: 구독 생성 후 카드 등록
          // 카드 등록 실패/취소 시 이 행 자체를 되돌릴(삭제할) 수 있도록 표시해서
          // failUrl에 실어 보낸다(59차 QA 확인, Critical - 위 두 분기와 동일한 이유,
          // 이 경우는 되돌릴 "원래 플랜"이 없고 이번에 새로 만든 행 자체가 문제이므로 삭제)
          //
          // current_period_end를 비워두면(=null) 이 뒤에 이어지는 카드등록 팝업+
          // billing-success 페이지의 2단계 결제(Step1 카드등록/Step2 실결제) 중 Step2가
          // 브라우저 강제종료·네트워크 단절 등으로 아예 실행되지 못했을 때, status가
          // 이미 'active'인 이 행을 daily-tasks의 만료 쿼리(current_period_end 부등식
          // 비교)가 null과는 절대 매치하지 못해 결제 한 번 없이 영구 무제한 접근이
          // 가능해진다(61차 QA 확인, Critical). 지금 시각으로 채워두면 Step2가 실제로
          // 성공할 때 정상적인 결제 주기로 덮어써지고(에지 함수가 성공 시 항상
          // current_period_end를 다시 계산해 씀), 실패해 방치되면 다음 크론 실행 때
          // 자연히 만료 처리된다.
          const { data: newSub, error } = await supabase
            .from('company_subscriptions')
            .insert({
              company_id: companyId,
              plan_id: plan.id,
              status: 'active',
              billing_cycle: billingCycle,
              current_period_end: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (error) throw new Error(error.message)

          const tossPayments = await loadTossPayments(
            process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
          )
          const failParams = new URLSearchParams({
            subscriptionId: newSub.id,
            wasNewlyCreated: 'true',
          })
          await tossPayments.requestBillingAuth('카드', {
            customerKey: companyId,
            successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${newSub.id}`,
            failUrl: `${window.location.origin}/dashboard/subscription/billing-fail?${failParams}`,
          })
        }
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast.error(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const maskCardNumber = (number: string) => {
    const digits = number.replace(/\D/g, '')
    if (digits.length < 8) return number
    return `${digits.slice(0, 4)}-****-****-${digits.slice(-4)}`
  }

  const handleChangeCard = async () => {
    if (!currentSubscription) return
    setCardChanging(true)
    try {
      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      // 연체(past_due) 상태에서 mode=update로 카드만 바꾸면 billing-success 페이지가
      // 즉시 결제(Step 2)를 건너뛰어, 새 카드를 등록해도 구독은 여전히 past_due로
      // 남고 그대로 유예기간 만료까지 흘러갔다(56차 QA 확인) - 연체 중일 때는
      // mode를 생략해 카드 등록 직후 밀린 결제를 즉시 재시도하도록 한다.
      const successUrl = isPastDue
        ? `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${currentSubscription.id}`
        : `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${currentSubscription.id}&mode=update`
      await tossPayments.requestBillingAuth('카드', {
        customerKey: companyId,
        successUrl,
        failUrl: `${window.location.origin}/dashboard/subscription/billing-fail`,
      })
      setCardChanging(false)
    } catch (err) {
      console.error('Card change error:', err)
      toast.error('카드 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setCardChanging(false)
    }
  }

  const handleCancelPendingChange = async () => {
    const confirmed = confirm('예약된 플랜 변경을 취소하시겠습니까?\n취소하면 현재 플랜이 계속 유지됩니다.')
    if (!confirmed) return

    setCancelPendingLoading(true)
    try {
      const res = await fetch('/api/subscription/cancel-pending-change', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '예약 취소에 실패했습니다.')
        return
      }
      toast.success('예약된 플랜 변경이 취소되었습니다.')
      router.refresh()
    } catch {
      toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setCancelPendingLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelLoading(true)
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '구독 취소에 실패했습니다.')
        return
      }
      setCancelResult({ accessUntil: data.accessUntil })
      router.refresh()
    } catch {
      toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setCancelLoading(false)
    }
  }

  const getButtonLabel = (plan: Plan, isCurrentPlan: boolean): string => {
    if (loading && selectedPlan?.id === plan.id) return '처리 중...'
    // 체험 중 플랜: 결제 전환 허용 (disabled 아님)
    if (isCurrentPlan && isCurrentlyOnTrial) return hasBillingKey ? '지금 결제하기' : '결제하여 구독 시작'
    // 취소/정지됐지만 기간이 남은 플랜: 재구독 허용 (disabled 아님)
    if (isCurrentPlan && (isCancelledWithValidAccess || isSuspendedWithValidAccess)) return '재구독하기'
    // 결제 실패로 유예기간 중인 플랜: 재결제 허용 (disabled 아님)
    if (isCurrentPlan && isPastDue) return hasBillingKey ? '결제 재시도' : '결제 정보 등록'
    // 만료됐거나 기간이 지난 취소/정지 플랜(카드등록 후 즉시결제가 중단된 경우 등):
    // 재결제 허용 (disabled 아님)
    if (isCurrentPlan && isCurrentPlanUnpaid) return hasBillingKey ? '결제 재시도' : '결제 정보 등록'
    if (isCurrentPlan) return '현재 사용 중'
    if (plan.price_monthly === 0 && plan.price_yearly === 0) return '문의하기'
    if (plan.name === 'Free' && plan.price_monthly === 0) return '무료로 전환'

    // 유료 플랜
    if (isExistingUser) return hasBillingKey ? '플랜 변경' : '구독하기'
    // 신규 사용자: 프로 플랜만 7일 무료 체험, 나머지 유료 플랜은 바로 구독
    if (plan.name === '프로') return '7일 무료 체험'
    return '구독하기'
  }

  return (
    <div className="space-y-8">
      {/* 현재 구독 정보 */}
      {currentSubscription && (
        <div className={`rounded-xl p-6 text-white ${
          isCurrentlyOnTrial
            ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
            : isOnFreePlan
            ? 'bg-gradient-to-r from-gray-500 to-gray-700'
            : currentSubscription.status === 'cancelled'
            ? 'bg-gradient-to-r from-orange-400 to-amber-500'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {currentSubscription.subscription_plans.name.endsWith('플랜')
                  ? currentSubscription.subscription_plans.name
                  : `${currentSubscription.subscription_plans.name} 플랜`}
              </h2>
              <p className="mt-1 opacity-90">
                {currentSubscription.status === 'cancelled'
                  ? '구독 취소됨'
                  : currentSubscription.status === 'expired'
                  ? '구독 만료'
                  : isCurrentlyOnTrial
                  ? '무료 체험 중'
                  : isOnFreePlan
                  ? '무료 플랜 이용 중'
                  : currentSubscription.status === 'active'
                  ? '구독 활성'
                  : currentSubscription.status === 'past_due'
                  ? '결제 지연'
                  : '만료'}
              </p>
              {currentSubscription.status === 'cancelled' && currentSubscription.current_period_end && (
                <p className="mt-1 text-sm opacity-90">
                  {formatDate(currentSubscription.current_period_end)}까지 이용 가능
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {isCurrentlyOnTrial && currentSubscription.trial_end_date && (
                <p className="text-sm opacity-90">
                  체험 종료: {formatDate(currentSubscription.trial_end_date)}
                </p>
              )}
              {!isOnFreePlan && !isCurrentlyOnTrial && currentSubscription.current_period_end && currentSubscription.status === 'active' && (
                <p className="text-sm opacity-90">
                  다음 결제일: {formatDate(currentSubscription.current_period_end)}
                </p>
              )}
              {currentSubscription.status === 'expired' && currentSubscription.current_period_end && (
                <p className="text-sm opacity-90">
                  만료일: {formatDate(currentSubscription.current_period_end)}
                </p>
              )}
              {/* 구독 취소 버튼 - 활성 구독에만 표시 */}
              {currentSubscription.status === 'active' && (
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="mt-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors border border-white/30"
                >
                  구독 취소
                </button>
              )}
            </div>
          </div>
          {/* 다운그레이드 예약 안내 - 취소/만료된 구독은 예약이 실현될 수 없으므로 제외.
              (status==='active'|'past_due'가 아니면 예약 취소 API도 대상 구독을 찾지 못해 에러난다) */}
          {currentSubscription.pending_plan_id &&
            currentSubscription.current_period_end &&
            (currentSubscription.status === 'active' || currentSubscription.status === 'past_due') && (
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm opacity-90">
                다음 결제일({formatDate(currentSubscription.current_period_end)})에
                {pendingPlanName ? ` ${pendingPlanName} 플랜으로` : ' 플랜이'} 변경될 예정입니다.
              </p>
              <button
                onClick={handleCancelPendingChange}
                disabled={cancelPendingLoading}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-lg transition-colors border border-white/30 disabled:opacity-50"
              >
                {cancelPendingLoading ? '취소 중...' : '예약 취소'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 구독 취소 확인 모달 */}
      {cancelModalOpen && currentSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            ref={cancelModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-subscription-title"
            onKeyDown={(e) => trapModalTab(e, cancelModalRef, () => setCancelModalOpen(false))}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 id="cancel-subscription-title" className="text-lg font-bold text-gray-900">구독을 취소하시겠습니까?</h3>
            </div>
            <div className="p-6 space-y-4">
              {cancelResult ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mx-auto">
                    <CheckIcon className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-base font-semibold text-gray-900">구독이 취소되었습니다.</p>
                  {cancelResult.accessUntil && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{formatDate(cancelResult.accessUntil)}</span>까지 서비스를 계속 이용하실 수 있습니다.
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setCancelModalOpen(false)
                      setCancelResult(null)
                    }}
                    className="w-full mt-2 px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-sm text-amber-800">
                    <p className="font-semibold">취소 전 확인해주세요</p>
                    <ul className="space-y-1.5 text-amber-700">
                      <li>• 현재 플랜: <span className="font-medium">{currentSubscription.subscription_plans.name}</span></li>
                      {currentSubscription.current_period_end && (
                        <li>• <span className="font-medium">{formatDate(currentSubscription.current_period_end)}</span>까지 서비스 이용 가능</li>
                      )}
                      <li>• 이후에는 서비스 접근이 제한되며, 다시 이용하려면 플랜을 새로 선택해야 합니다.</li>
                      <li>• 취소 후 기간 내 재구독이 가능합니다.</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelModalOpen(false)}
                      disabled={cancelLoading}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      돌아가기
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      className="flex-1 px-4 py-3 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300"
                    >
                      {cancelLoading ? '처리 중...' : '구독 취소'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 업그레이드 확인 모달 */}
      {upgradeModal && currentSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            ref={upgradeModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-confirm-title"
            onKeyDown={(e) => trapModalTab(e, upgradeModalRef, () => setUpgradeModal(null))}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 id="upgrade-confirm-title" className="text-lg font-bold text-gray-900">업그레이드 결제 확인</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>현재 플랜</span>
                  <span className="font-medium">{currentSubscription.subscription_plans.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>변경 플랜</span>
                  <span className="font-medium">{upgradeModal.plan.name}</span>
                </div>
                {!upgradeModal.isCycleChange && upgradeModal.remainingDays > 0 && (
                  <div className="flex justify-between">
                    <span>남은 기간</span>
                    <span className="font-medium">{upgradeModal.remainingDays}일</span>
                  </div>
                )}
                <div className="border-t border-blue-200 pt-2 flex justify-between font-semibold">
                  <span>{upgradeModal.isCycleChange ? '결제 금액' : '차액 결제 (VAT 포함)'}</span>
                  <span>{upgradeModal.proratedTotal.toLocaleString()}원</span>
                </div>
              </div>
              {!upgradeModal.isCycleChange && (
                <p className="text-xs text-gray-500">
                  * 다음 결제일부터는 {(billingCycle === 'monthly' ? upgradeModal.plan.price_monthly : upgradeModal.plan.price_yearly).toLocaleString()}원/{billingCycle === 'monthly' ? '월' : '연'}이 청구됩니다.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setUpgradeModal(null)}
                  disabled={upgradeLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUpgradeConfirm}
                  disabled={upgradeLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {upgradeLoading ? '처리 중...' : '결제하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">구독 플랜 선택</h1>
        <p className="mt-2 text-gray-600">
          {isCurrentlyOnTrial && hasBillingKey
            ? '지금 결제하면 체험 기간과 무관하게 즉시 구독이 시작됩니다.'
            : isCurrentlyOnTrial
            ? '카드를 등록하면 즉시 결제되어 구독이 시작됩니다. 체험 기간은 그대로 유지됩니다.'
            : (isActivePaidUser || hasPreviousSubscription) && hasBillingKey
            ? '플랜을 선택하면 등록된 카드로 즉시 결제가 진행됩니다.'
            : isExistingUser
            ? '플랜을 선택하면 카드 등록 후 즉시 결제가 진행됩니다.'
            : '프로 플랜은 7일 무료 체험 가능. 나머지 플랜은 카드 등록 후 즉시 결제됩니다.'}
        </p>
      </div>

      {/* 결제 주기 선택 */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월별 결제
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            연간 결제
            <span className="ml-2 text-xs text-green-600 font-bold">10% 할인</span>
          </button>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {sortedPlans.map((plan) => {
          const isCurrentPlan =
            currentSubscription?.subscription_plans.id === plan.id &&
            (currentSubscription?.billing_cycle === billingCycle ||
              plan.name === 'Free')
          // 이미 선택(가입)한 플랜이 있으면 "추천" 강조는 의미가 없으므로, 현재 플랜
          // 강조만 남기고 추천 배지는 신규 사용자(구독이 아예 없는 경우)에게만 보여준다.
          const isRecommended = !currentSubscription && plan.sort_order === 3
          const canReactivate =
            isCurrentPlan &&
            (isCancelledWithValidAccess || isSuspendedWithValidAccess || isPastDue || isCurrentPlanUnpaid)
          const isEnterprise = plan.price_monthly === 0 && plan.price_yearly === 0
          const isFree = plan.name === 'Free' && plan.price_monthly === 0

          const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
          const priceLabel = billingCycle === 'monthly' ? '월' : '연'

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-6 h-full flex flex-col ${
                isCurrentPlan
                  ? 'border-blue-500 bg-blue-50'
                  : isRecommended
                  ? 'border-indigo-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {isRecommended && !isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                    추천
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                    현재 플랜
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              </div>

              <div className="text-center mb-6">
                {isEnterprise ? (
                  <p className="text-2xl font-bold text-gray-900">가격 협의</p>
                ) : isFree ? (
                  <p className="text-3xl font-bold text-gray-900">무료</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900">
                      {price.toLocaleString()}원<span className="text-sm text-gray-600">/{priceLabel}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">VAT 별도</p>
                    {billingCycle === 'yearly' && plan.price_monthly > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        연간 결제 시 {Math.round((plan.price_monthly * 12 - plan.price_yearly) / 10000)}만원 절약
                      </p>
                    )}
                    {!isExistingUser && !isActivePaidUser && plan.name === '프로' && (
                      <p className="text-xs text-indigo-600 mt-1 font-medium">7일 무료 체험 가능</p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {formatFeatures(plan).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={loading || (isCurrentPlan && !isCurrentlyOnTrial && !canReactivate)}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all mt-auto ${
                  isCurrentPlan && !isCurrentlyOnTrial && !canReactivate
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : isFree
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : isRecommended
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {getButtonLabel(plan, isCurrentPlan)}
              </button>
            </div>
          )
        })}
      </div>

      {/* 결제 수단 */}
      {currentSubscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="text-base font-semibold text-gray-900">결제 수단</h3>
            </div>
            <Link
              href="/dashboard/payments"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              결제내역 보기 →
            </Link>
          </div>

          {(() => {
            const cardInfo = currentSubscription.billing_key
              ? (currentSubscription as any).card_info
              : companyCardInfo
            const hasBillingKeyForDisplay = !!(currentSubscription.billing_key || companyCardInfo)

            return hasBillingKeyForDisplay && cardInfo ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-gray-700 to-gray-900 rounded-md flex items-center justify-center">
                    <span className="text-white text-xs font-bold">CARD</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {cardInfo.number ? maskCardNumber(cardInfo.number) : '카드 정보 없음'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[cardInfo.cardType, cardInfo.ownerType].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleChangeCard}
                  disabled={cardChanging}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cardChanging ? '이동 중...' : '카드 변경'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-gray-100 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">등록된 카드가 없습니다.</p>
                </div>
                <button
                  onClick={handleChangeCard}
                  disabled={cardChanging}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cardChanging ? '이동 중...' : '카드 등록'}
                </button>
              </div>
            )
          })()}
        </div>
      )}

      {/* 안내 문구 */}
      <div className="text-center text-sm text-gray-500 space-y-1 mt-8">
        {!isExistingUser && (
          <p>* 프로 플랜 7일 무료 체험은 카드 등록 없이 시작할 수 있습니다. 체험 기간이 끝나면 서비스 접근이 제한되며, 계속 이용하려면 플랜을 선택해야 합니다.</p>
        )}
        <p>* 모든 가격은 VAT 별도입니다.</p>
      </div>
    </div>
  )
}
