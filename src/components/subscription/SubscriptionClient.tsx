'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon } from '@heroicons/react/24/outline'
import { loadTossPayments } from '@tosspayments/payment-sdk'
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
  max_leads: number | null
  max_campaigns: number | null
}

interface CurrentSubscription {
  id: string
  status: string
  billing_cycle: string
  trial_end_date: string | null
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
  subscription_plans: Plan
}

interface SubscriptionClientProps {
  plans: Plan[]
  currentSubscription: CurrentSubscription | null
  subscriptionHistory: CurrentSubscription[]
  companyId: string
}

// Helper function to convert features object to array of strings
function formatFeatures(plan: Plan): string[] {
  const features: string[] = []

  if (plan.max_leads) {
    features.push(`월 리드 수: ${plan.max_leads.toLocaleString()}명`)
  }
  if (plan.max_users) {
    features.push(`팀 멤버: ${plan.max_users}명`)
  }
  if (plan.max_campaigns) {
    features.push(`캠페인: ${plan.max_campaigns}개`)
  }

  // Add features from JSON object
  if (plan.features && typeof plan.features === 'object') {
    if (plan.features.email_support) {
      features.push('이메일 지원')
    }
    if (plan.features.basic_analytics) {
      features.push('기본 분석')
    }
    if (plan.features.advanced_analytics) {
      features.push('고급 분석')
    }
    if (plan.features.priority_support) {
      features.push('우선 지원')
    }
    if (plan.features.custom_integration) {
      features.push('맞춤 통합')
    }
    if (plan.features.dedicated_manager) {
      features.push('전담 매니저')
    }
  }

  return features
}

export default function SubscriptionClient({
  plans,
  currentSubscription,
  subscriptionHistory,
  companyId,
}: SubscriptionClientProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Realtime 구독 - 내 구독 상태 변경 감지
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
          filter: `company_id=eq.${companyId}`, // 현재 회사만
        },
        (payload) => {
          console.log('🔔 My subscription changed:', payload)
          console.log('  - Event type:', payload.eventType)
          console.log('  - New status:', (payload.new as any)?.status)

          // Server Component 데이터 재조회
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId, router])

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan)
    setLoading(true)

    try {
      const supabase = createClient()

      // 기존 구독이 있으면 플랜 변경, 없으면 신규 구독 생성
      if (currentSubscription) {
        // 플랜 변경 - 새로운 결제 주기에 맞춰 기간 재계산
        const now = new Date()
        const newPeriodEnd = new Date()

        if (billingCycle === 'monthly') {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
        } else {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
        }

        const { error: updateError } = await supabase
          .from('company_subscriptions')
          .update({
            plan_id: plan.id,
            billing_cycle: billingCycle,
            current_period_start: now.toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
          })
          .eq('id', currentSubscription.id)

        if (updateError) throw new Error(updateError.message)

        alert(`플랜이 ${plan.name} (${billingCycle === 'monthly' ? '월간' : '연간'})(으)로 변경되었습니다.`)
        router.refresh()
      } else {
        // 신규 구독 생성 (체험)
        const now = new Date()
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7) // 7일 무료 체험

        const periodEndDate = new Date()
        if (billingCycle === 'monthly') {
          periodEndDate.setMonth(periodEndDate.getMonth() + 1)
        } else {
          periodEndDate.setFullYear(periodEndDate.getFullYear() + 1)
        }

        const { data: subscription, error: subError } = await supabase
          .from('company_subscriptions')
          .insert({
            company_id: companyId,
            plan_id: plan.id,
            status: 'trial',
            billing_cycle: billingCycle,
            current_period_start: now.toISOString(),
            current_period_end: periodEndDate.toISOString(),
            trial_start_date: now.toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            customer_key: `customer_${companyId}_${Date.now()}`,
          })
          .select()
          .single()

        if (subError) {
          throw new Error(subError.message)
        }

        // 토스 결제 위젯 로드 및 빌링키 발급 페이지로 이동
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
        const tossPayments = await loadTossPayments(clientKey)

        // 빌링키 발급을 위한 인증창 요청
        await tossPayments.requestBillingAuth('카드', {
          customerKey: subscription.customer_key,
          successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${subscription.id}`,
          failUrl: `${window.location.origin}/dashboard/subscription/billing-fail`,
        })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('구독 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly
  }

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.price_monthly * 12
    const yearlyCost = plan.price_yearly
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100)
  }

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return

    setCancelLoading(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('company_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', currentSubscription.id)

      if (error) throw new Error(error.message)

      alert('구독이 취소되었습니다. 현재 결제 기간이 종료될 때까지 서비스를 계속 이용하실 수 있습니다.')
      setShowCancelConfirm(false)
      router.refresh()
    } catch (error) {
      console.error('Cancel subscription error:', error)
      alert('구독 취소 중 오류가 발생했습니다.')
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 현재 구독 정보 섹션 */}
      {currentSubscription && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">현재 구독 플랜</h2>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    currentSubscription.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : currentSubscription.status === 'trial'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {currentSubscription.status === 'active'
                    ? '활성'
                    : currentSubscription.status === 'trial'
                    ? '체험 중'
                    : '만료'}
                </span>
              </div>

              <p className="text-2xl font-bold text-blue-600 mb-1">
                {currentSubscription.subscription_plans.name} 플랜
              </p>
              <p className="text-sm text-gray-600">
                {currentSubscription.billing_cycle === 'monthly' ? '월간 결제' : '연간 결제'} •{' '}
                {currentSubscription.billing_cycle === 'monthly'
                  ? `₩${currentSubscription.subscription_plans.price_monthly.toLocaleString()}/월`
                  : `₩${currentSubscription.subscription_plans.price_yearly.toLocaleString()}/년`}
              </p>

              {currentSubscription.status === 'trial' && currentSubscription.trial_end_date && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-blue-200">
                  <svg
                    className="h-4 w-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    무료 체험 종료: {formatDate(currentSubscription.trial_end_date)}
                  </span>
                </div>
              )}

              {currentSubscription.status === 'active' && currentSubscription.current_period_end && (
                <p className="text-sm text-gray-600 mt-2">
                  다음 결제일: {formatDate(currentSubscription.current_period_end)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {currentSubscription.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  구독 취소
                </button>
              )}
              <p className="text-xs text-gray-500 text-right">구독 ID</p>
              <p className="text-xs font-mono text-gray-400 text-right">{currentSubscription.id.slice(0, 8)}...</p>
            </div>
          </div>

          {/* 취소 확인 모달 */}
          {showCancelConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">구독을 취소하시겠습니까?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  구독을 취소하시면 현재 결제 기간({formatDate(currentSubscription.current_period_end!)})까지
                  서비스를 계속 이용하실 수 있습니다. 이후에는 무료 플랜으로 전환됩니다.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {cancelLoading ? '처리 중...' : '구독 취소하기'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 플랜 선택 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {currentSubscription ? '플랜 변경' : '플랜 선택'}
        </h1>
        <p className="text-base text-gray-600">
          {currentSubscription
            ? '더 많은 기능이 필요하신가요? 플랜을 업그레이드하세요'
            : '7일 무료 체험을 시작하고 최적의 플랜을 선택하세요'}
        </p>
      </div>

      {/* 결제 주기 선택 */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            연간 결제
            <span className="ml-2 text-xs text-green-600 font-bold">
              최대 17% 할인
            </span>
          </button>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrentPlan =
            currentSubscription?.subscription_plans.id === plan.id
          const isPro = plan.name.toLowerCase() === 'pro'

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-5 ${
                isPro
                  ? 'border-blue-500 shadow-xl'
                  : 'border-gray-200 shadow-sm'
              } ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
            >
              {isPro && (
                <div className="absolute top-0 right-6 transform -translate-y-1/2">
                  <span className="inline-flex rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold text-white">
                    추천
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{plan.description}</p>

                <div className="mt-4">
                  <p className="text-3xl font-bold text-gray-900">
                    {getPrice(plan).toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    / {billingCycle === 'monthly' ? '월' : '년'}
                  </p>
                  {billingCycle === 'yearly' && plan.price_monthly > 0 && (
                    <p className="text-sm text-green-600 font-semibold mt-1">
                      {getSavings(plan)}% 절약
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading || isCurrentPlan}
                  className={`mt-5 w-full rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                    isPro
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } ${
                    isCurrentPlan
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isCurrentPlan
                    ? '현재 플랜'
                    : loading
                    ? '처리 중...'
                    : currentSubscription
                    ? '이 플랜으로 변경'
                    : '7일 무료 체험 시작'}
                </button>
              </div>

              <ul className="mt-5 space-y-2.5">
                {formatFeatures(plan).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-2.5 text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-5">
          자주 묻는 질문
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              무료 체험 기간은 어떻게 되나요?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              모든 플랜에서 7일 무료 체험이 제공됩니다. 체험 기간 동안 전체 기능을 무제한으로
              이용할 수 있습니다.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              결제 수단은 무엇이 지원되나요?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              신용카드, 계좌이체, 가상계좌 결제가 지원됩니다.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              플랜을 변경할 수 있나요?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 변경 시
              일할 계산으로 정산됩니다.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              세금계산서 발행이 가능한가요?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              네, 결제 후 세금계산서 발행을 요청하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 구독 이력 */}
      {subscriptionHistory.length > 0 && (
        <div className="mt-10 border-t border-gray-200 pt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-5">구독 이력</h2>
          <div className="space-y-3">
            {subscriptionHistory.map((subscription) => (
              <div
                key={subscription.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {subscription.subscription_plans.name} 플랜
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : subscription.status === 'trial'
                            ? 'bg-blue-100 text-blue-700'
                            : subscription.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {subscription.status === 'active'
                          ? '활성'
                          : subscription.status === 'trial'
                          ? '체험'
                          : subscription.status === 'cancelled'
                          ? '취소됨'
                          : subscription.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        {subscription.billing_cycle === 'monthly' ? '월간' : '연간'} •{' '}
                        {subscription.billing_cycle === 'monthly'
                          ? `₩${subscription.subscription_plans.price_monthly.toLocaleString()}`
                          : `₩${subscription.subscription_plans.price_yearly.toLocaleString()}`}
                      </span>
                      {subscription.trial_end_date && (
                        <span>체험 종료: {formatDate(subscription.trial_end_date)}</span>
                      )}
                      {subscription.current_period_end && (
                        <span>종료일: {formatDate(subscription.current_period_end)}</span>
                      )}
                      {subscription.cancelled_at && (
                        <span className="text-red-600">
                          취소일: {formatDate(subscription.cancelled_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-400">
                    <p>{new Date(subscription.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
