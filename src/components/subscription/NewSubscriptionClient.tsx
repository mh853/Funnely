'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'

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
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
  has_used_trial: boolean
  subscription_plans: Plan
}

interface NewSubscriptionClientProps {
  plans: Plan[]
  currentSubscription: CurrentSubscription | null
  companyId: string
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
}: NewSubscriptionClientProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const sortedPlans = [...plans].sort((a, b) => a.sort_order - b.sort_order)

  // 체험 이력 여부: has_used_trial=true이거나 현재 trial 중이면 기존 사용자
  const hasUsedTrial = currentSubscription?.has_used_trial === true
  const isCurrentlyOnTrial = currentSubscription?.status === 'trial'
  const isExistingUser = hasUsedTrial || isCurrentlyOnTrial

  // 현재 Free 플랜인지
  const isOnFreePlan =
    currentSubscription?.status === 'active' &&
    currentSubscription?.subscription_plans?.name === 'Free'

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

  const handleSelectPlan = async (plan: Plan) => {
    // 가격 협의 플랜
    if (plan.price_monthly === 0 && plan.price_yearly === 0) {
      alert('대규모 조직을 위한 플랜은 별도 문의가 필요합니다. 고객센터로 연락해주세요.')
      return
    }

    setSelectedPlan(plan)
    setLoading(true)

    try {
      const supabase = createClient()
      const isFree = plan.name === 'Free' && plan.price_monthly === 0

      if (currentSubscription) {
        if (isFree) {
          // Free 플랜으로 다운그레이드: 즉시 적용, 기간 없음
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
            })
            .eq('id', currentSubscription.id)

          if (error) throw new Error(error.message)

          alert('Free 플랜으로 변경되었습니다.')
          router.refresh()
        } else if (isExistingUser) {
          // 기존 사용자 (체험 이력 있음) → 플랜 변경 후 결제 안내
          const now = new Date()
          const newPeriodEnd = new Date()
          if (billingCycle === 'monthly') {
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
            newPeriodEnd.setDate(newPeriodEnd.getDate() - 1)
          } else {
            newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
            newPeriodEnd.setDate(newPeriodEnd.getDate() - 1)
          }

          const { error } = await supabase
            .from('company_subscriptions')
            .update({
              plan_id: plan.id,
              billing_cycle: billingCycle,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: newPeriodEnd.toISOString(),
            })
            .eq('id', currentSubscription.id)

          if (error) throw new Error(error.message)

          alert(`${plan.name} 플랜 (${billingCycle === 'monthly' ? '월간' : '연간'})으로 변경되었습니다.`)
          router.refresh()
        } else {
          // 신규 사용자 (Free → 유료 업그레이드, 첫 체험) → 7일 무료 체험 시작
          const now = new Date()
          const trialEndDate = new Date()
          trialEndDate.setDate(trialEndDate.getDate() + 7)

          const { error } = await supabase
            .from('company_subscriptions')
            .update({
              plan_id: plan.id,
              billing_cycle: billingCycle,
              status: 'trial',
              current_period_start: now.toISOString(),
              current_period_end: null,
              trial_start_date: now.toISOString(),
              trial_end_date: trialEndDate.toISOString(),
            })
            .eq('id', currentSubscription.id)

          if (error) throw new Error(error.message)

          alert('7일 무료 체험이 시작되었습니다!\n체험 종료 후 자동으로 Free 플랜으로 전환됩니다.')
          router.refresh()
        }
      } else {
        // 구독 자체가 없는 경우 (예외 - 보통 회원가입 시 Free 부여됨)
        const now = new Date()
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7)

        const { error } = await supabase
          .from('company_subscriptions')
          .insert({
            company_id: companyId,
            plan_id: plan.id,
            status: isFree ? 'active' : 'trial',
            billing_cycle: billingCycle,
            current_period_start: isFree ? null : now.toISOString(),
            current_period_end: null,
            trial_start_date: isFree ? null : now.toISOString(),
            trial_end_date: isFree ? null : trialEndDate.toISOString(),
            has_used_trial: false,
          })

        if (error) throw new Error(error.message)

        if (!isFree) {
          alert('7일 무료 체험이 시작되었습니다!\n체험 종료 후 자동으로 Free 플랜으로 전환됩니다.')
        }
        router.refresh()
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      alert(`오류가 발생했습니다: ${error.message}`)
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const getButtonLabel = (plan: Plan, isCurrentPlan: boolean) => {
    if (loading && selectedPlan?.id === plan.id) return '처리 중...'
    if (isCurrentPlan) return '현재 사용 중'
    if (plan.price_monthly === 0 && plan.price_yearly === 0) return '문의하기'
    if (plan.name === 'Free' && plan.price_monthly === 0) return '무료로 전환'

    // 유료 플랜
    if (isExistingUser) return '결제하기'
    return '7일 무료 체험'
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
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{currentSubscription.subscription_plans.name} 플랜</h2>
              <p className="mt-1 opacity-90">
                {isCurrentlyOnTrial
                  ? '무료 체험 중'
                  : isOnFreePlan
                  ? '무료 플랜 이용 중'
                  : currentSubscription.status === 'active'
                  ? '구독 활성'
                  : '결제 지연'}
              </p>
            </div>
            <div className="text-right">
              {isCurrentlyOnTrial && currentSubscription.trial_end_date && (
                <p className="text-sm opacity-90">
                  체험 종료: {formatDate(currentSubscription.trial_end_date)}
                </p>
              )}
              {!isOnFreePlan && !isCurrentlyOnTrial && currentSubscription.current_period_end && (
                <p className="text-sm opacity-90">
                  다음 결제일: {formatDate(currentSubscription.current_period_end)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">구독 플랜 선택</h1>
        <p className="mt-2 text-gray-600">
          {isExistingUser
            ? '플랜을 선택하면 바로 결제가 진행됩니다'
            : '7일 무료 체험 후 마음에 드시면 구독하세요. 카드 등록이 필요하지 않습니다.'}
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
          const isRecommended = plan.sort_order === 3
          const isEnterprise = plan.price_monthly === 0 && plan.price_yearly === 0
          const isFree = plan.name === 'Free' && plan.price_monthly === 0

          const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
          const priceLabel = billingCycle === 'monthly' ? '월' : '연'

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-6 ${
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
                    {billingCycle === 'yearly' && plan.price_monthly > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        연간 결제 시 {Math.round((plan.price_monthly * 12 - plan.price_yearly) / 10000)}만원 절약
                      </p>
                    )}
                    {!isExistingUser && (
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
                disabled={loading || isCurrentPlan}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                  isCurrentPlan
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

      {/* 안내 문구 */}
      <div className="text-center text-sm text-gray-500 space-y-1 mt-8">
        {!isExistingUser && (
          <p>* 7일 무료 체험은 카드 등록 없이 시작할 수 있습니다. 체험 종료 후 Free 플랜으로 자동 전환됩니다.</p>
        )}
        <p>* 모든 가격은 VAT 별도입니다</p>
      </div>
    </div>
  )
}
