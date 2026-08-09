'use client'

// 토스 빌링키 발급 완료 후 즉시 첫 결제까지 처리하는 페이지
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Strict Mode에서 useEffect가 두 번 실행되면 authKey가 소진되어 실패하므로 방지
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')
    const subscriptionId = searchParams.get('subscriptionId')
    // mode=update: 카드 변경만 (결제 없음) / 기본: 카드 등록 + 즉시 결제
    const mode = searchParams.get('mode') ?? 'payment'

    if (!authKey || !customerKey || !subscriptionId) {
      setError('필수 파라미터가 누락되었습니다.')
      setProcessing(false)
      return
    }

    const processPayment = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('로그인이 필요합니다.')
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.')

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

        // authKey는 Toss에서 1회성이라, 이미 한 번 처리(Step1 성공)한 뒤 새로고침이나
        // 탭 복원으로 이 컴포넌트가 재마운트되면(hasProcessed ref는 마운트 내 중복실행만
        // 막을 뿐 재마운트는 못 막음) 같은 authKey로 Step1을 다시 호출하게 되어 Toss가
        // 거부한다 - 실제로는 이미 성공했는데 "결제 실패"로 잘못 표시된다(61차 QA
        // 확인). 원래는 "구독에 billing_key가 이미 있는지"로 이 재실행 여부를
        // 판단했는데, 이미 다른(예전) 카드의 billing_key가 있는 상태에서 카드를
        // "변경"하는 모든 경우(past_due 재시도 포함)에 이 판단이 잘못 작동해 방금
        // 발급받은 새 authKey를 절대 교환하지 않고 DB에 남아있는 옛(거절된) 카드로
        // 계속 재시도하는 심각한 버그가 있었다(82차 QA) - 카드변경/재시도 자체가
        // 항상 실패하는데 사용자에겐 "완료" 메시지만 보였다. billing_key 존재여부가
        // 아니라 이 authKey 자체가 이 탭에서 이미 처리됐는지를 sessionStorage로
        // 정확히 추적한다.
        const step1Key = `billing-auth-processed:${authKey}`
        const step2Key = `billing-payment-processed:${authKey}`

        if (sessionStorage.getItem(step1Key) !== '1') {
          // Step 1: 빌링키 발급 + 카드 정보 저장
          // 프록시 API를 경유하여 trial 상태 구독도 처리 가능하도록 함
          const authRes = await fetch('/api/subscription/proxy-billing-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerKey, authKey, subscriptionId }),
          })
          if (!authRes.ok) {
            const err = await authRes.json()
            throw new Error(err.error || '카드 등록에 실패했습니다.')
          }
          sessionStorage.setItem(step1Key, '1')
        }

        // Step 2: 즉시 첫 결제 (카드 변경 모드에서는 생략, 이미 완료됐으면 생략)
        if (mode !== 'update' && sessionStorage.getItem(step2Key) !== '1') {
          const payRes = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ subscriptionId }),
          })
          if (!payRes.ok) {
            const err = await payRes.json()
            throw new Error(err.error || '결제에 실패했습니다.')
          }
          sessionStorage.setItem(step2Key, '1')
        }

        setProcessing(false)

        const redirectPath = mode === 'update' ? '/dashboard/payments' : '/dashboard/subscription'
        setTimeout(() => router.push(redirectPath), 3000)
      } catch (err: any) {
        console.error('Payment process error:', err)
        setError(err.message)
        setProcessing(false)
      }
    }

    processPayment()
  }, [searchParams, router])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">결제를 처리하는 중...</p>
          <p className="mt-2 text-sm text-gray-500">잠시만 기다려 주세요.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <span className="text-red-600 text-3xl">✕</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">결제 실패</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="mt-6 w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700"
            >
              다시 시도하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            {searchParams.get('mode') === 'update' ? '카드 변경 완료!' : '결제 완료!'}
          </h2>
          <p className="mt-2 text-gray-600">
            {searchParams.get('mode') === 'update'
              ? '결제 수단이 성공적으로 변경되었습니다.'
              : '구독이 성공적으로 활성화되었습니다.'}
          </p>
          <p className="mt-4 text-sm text-gray-500">
            잠시 후 이동합니다...
          </p>
        </div>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  )
}
