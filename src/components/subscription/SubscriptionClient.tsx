'use client'

import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/date'

interface Plan {
  id: string
  plan_name: string
  display_name: string
  description: string
  monthly_price: number
  yearly_price: number
  features: string[]
  max_landing_pages: number | null
  max_leads: number | null
  max_team_members: number | null
}

interface CurrentSubscription {
  id: string
  status: string
  billing_cycle: string
  trial_end_date: string | null
  current_period_end: string | null
  subscription_plans: Plan
}

interface SubscriptionClientProps {
  plans: Plan[]
  currentSubscription: CurrentSubscription | null
  companyId: string
}

export default function SubscriptionClient({
  plans,
  currentSubscription,
  companyId,
}: SubscriptionClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const handleSelectPlan = async (plan: Plan) => {
    setSelectedPlan(plan)
    setLoading(true)

    try {
      const supabase = createClient()

      // 체험 구독 생성
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 7) // 7일 무료 체험

      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: plan.id,
          status: 'trial',
          billing_cycle: billingCycle,
          trial_start_date: new Date().toISOString(),
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
    } catch (error) {
      console.error('Subscription error:', error)
      alert('구독 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price
  }

  const getSavings = (plan: Plan) => {
    const monthlyCost = plan.monthly_price * 12
    const yearlyCost = plan.yearly_price
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {currentSubscription ? '구독 플랜 변경' : '플랜 선택'}
        </h1>
        <p className="text-lg text-gray-600">
          7일 무료 체험을 시작하고 최적의 플랜을 선택하세요
        </p>

        {currentSubscription && (
          <div className="mt-4 inline-block bg-blue-50 rounded-lg px-6 py-3">
            <p className="text-sm text-gray-600">현재 플랜</p>
            <p className="text-lg font-semibold text-blue-600">
              {currentSubscription.subscription_plans.display_name} -{' '}
              {currentSubscription.billing_cycle === 'monthly' ? '월간' : '연간'}
            </p>
            {currentSubscription.status === 'trial' && (
              <p className="text-sm text-gray-600 mt-1">
                체험 종료: {formatDate(currentSubscription.trial_end_date!)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 결제 주기 선택 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            월간 결제
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
            <span className="ml-2 text-xs text-green-600 font-bold">
              최대 17% 할인
            </span>
          </button>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan =
            currentSubscription?.subscription_plans.id === plan.id
          const isPro = plan.plan_name === 'pro'

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-8 ${
                isPro
                  ? 'border-blue-500 shadow-xl'
                  : 'border-gray-200 shadow-sm'
              } ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
            >
              {isPro && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="inline-flex rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold text-white">
                    추천
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  {plan.display_name}
                </h3>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>

                <div className="mt-6">
                  <p className="text-4xl font-bold text-gray-900">
                    {getPrice(plan).toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    / {billingCycle === 'monthly' ? '월' : '년'}
                  </p>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 font-semibold mt-2">
                      {getSavings(plan)}% 절약
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading || isCurrentPlan}
                  className={`mt-8 w-full rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${
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
                    : '7일 무료 체험 시작'}
                </button>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-3 text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="mt-16 border-t border-gray-200 pt-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          자주 묻는 질문
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              무료 체험 기간은 어떻게 되나요?
            </h3>
            <p className="mt-2 text-gray-600">
              모든 플랜에서 7일 무료 체험이 제공됩니다. 체험 기간 동안 전체 기능을 무제한으로
              이용할 수 있습니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              결제 수단은 무엇이 지원되나요?
            </h3>
            <p className="mt-2 text-gray-600">
              신용카드, 계좌이체, 가상계좌 결제가 지원됩니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              플랜을 변경할 수 있나요?
            </h3>
            <p className="mt-2 text-gray-600">
              언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 변경 시
              일할 계산으로 정산됩니다.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              세금계산서 발행이 가능한가요?
            </h3>
            <p className="mt-2 text-gray-600">
              네, 결제 후 세금계산서 발행을 요청하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
