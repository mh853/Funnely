'use client'

// 가입 직후 "프로 7일 체험도 해보시겠어요?" → "카드도 지금 등록할까요?" 2단계 질문 UI
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics/track'

interface SelectedPlan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number | null
}

interface PlanSetupClientProps {
  companyId: string
  planSlug: string
  billingCycle: 'monthly' | 'yearly'
  selectedPlan: SelectedPlan
  proPlanId: string
}

function formatPrice(plan: SelectedPlan, billingCycle: 'monthly' | 'yearly'): string {
  const amount = billingCycle === 'yearly' && plan.price_yearly ? plan.price_yearly : plan.price_monthly
  const unit = billingCycle === 'yearly' ? '년' : '월'
  return `₩${amount.toLocaleString()}/${unit}`
}

export default function PlanSetupClient({
  companyId,
  planSlug,
  billingCycle,
  selectedPlan,
  proPlanId,
}: PlanSetupClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<'ask-trial' | 'ask-card'>('ask-trial')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Q1 "아니오" - 체험 없이 선택한 요금제로 바로 결제 (기존 "신규 사용자 + 기타 유료
  // 플랜" 흐름과 동일: 구독 행을 먼저 만들고 카드 등록 후 즉시 결제로 이어진다)
  const handleDeclineTrial = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: newSub, error: insertError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: companyId,
          plan_id: selectedPlan.id,
          status: 'active',
          billing_cycle: billingCycle,
          current_period_end: new Date().toISOString(),
        } as any)
        .select('id')
        .single()
      if (insertError || !newSub) throw new Error(insertError?.message || '구독 생성에 실패했습니다.')

      const planPrice = billingCycle === 'yearly' && selectedPlan.price_yearly ? selectedPlan.price_yearly : selectedPlan.price_monthly
      trackEvent({
        event: 'checkout_started',
        plan: planSlug,
        value: planPrice,
        currency: 'KRW',
        billing_cycle: billingCycle === 'yearly' ? 'annual' : 'monthly',
      })

      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      const failParams = new URLSearchParams({
        subscriptionId: (newSub as any).id,
        wasNewlyCreated: 'true',
      })
      await tossPayments.requestBillingAuth('카드', {
        customerKey: companyId,
        successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${(newSub as any).id}`,
        failUrl: `${window.location.origin}/dashboard/subscription/billing-fail?${failParams}`,
      })
      // requestBillingAuth가 페이지를 리다이렉트하므로 이후 코드는 실행되지 않음
    } catch (err: any) {
      setError(err.message || '결제 진행 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  // Q2 "아니오" - 카드 없이 프로 체험만 시작
  const handleDeclineCard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscription/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId: proPlanId,
          billingCycle: 'monthly',
          pendingPlanSlug: planSlug,
          pendingBillingCycle: billingCycle,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '무료 체험 시작에 실패했습니다.')
      trackEvent({ event: 'trial_started', plan: 'pro', trial_days: 7 })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || '무료 체험 시작 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  // Q2 "예" - 프로 체험 시작 + 카드 등록(결제는 하지 않음, 체험 종료 시 자동 전환)
  const handleAcceptCard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/subscription/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId: proPlanId,
          billingCycle: 'monthly',
          pendingPlanSlug: planSlug,
          pendingBillingCycle: billingCycle,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '무료 체험 시작에 실패했습니다.')
      trackEvent({ event: 'trial_started', plan: 'pro', trial_days: 7 })

      const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      await tossPayments.requestBillingAuth('카드', {
        customerKey: companyId,
        successUrl: `${window.location.origin}/dashboard/subscription/billing-success?subscriptionId=${data.subscriptionId}&mode=update`,
        failUrl: `${window.location.origin}/dashboard/subscription/billing-fail`,
      })
      // requestBillingAuth가 페이지를 리다이렉트하므로 이후 코드는 실행되지 않음
    } catch (err: any) {
      setError(err.message || '카드 등록 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl px-8 py-8">
        {step === 'ask-trial' ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              프로 플랜 7일 무료체험도 해보시겠어요?
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              선택하신 <strong>{selectedPlan.name}</strong> 플랜({formatPrice(selectedPlan, billingCycle)}) 대신, 먼저 7일간 프로 플랜의 모든 기능을 체험해보실 수 있습니다.
              체험이 끝나면 자동으로 {selectedPlan.name} 플랜으로 전환됩니다. 카드 등록은 필요 없습니다.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep('ask-card')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                네, 프로 체험해볼게요
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeclineTrial}
                className="w-full border-2 border-gray-300 text-gray-700 py-2.5 rounded-full font-semibold hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                {loading ? '처리 중...' : `아니오, ${selectedPlan.name} 플랜으로 바로 결제할게요`}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              결제 정보도 지금 등록하시겠어요?
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              카드를 지금 등록해두시면, 7일 체험이 끝난 뒤 별도 절차 없이 자동으로 {selectedPlan.name} 플랜 결제가 진행됩니다.
              등록하지 않으셔도 체험은 정상적으로 시작되며, 체험 종료 후 언제든 직접 플랜을 선택해 결제하실 수 있습니다.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleAcceptCard}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '네, 카드 등록할게요'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDeclineCard}
                className="w-full border-2 border-gray-300 text-gray-700 py-2.5 rounded-full font-semibold hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
              >
                {loading ? '처리 중...' : '아니오, 체험만 시작할게요'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
