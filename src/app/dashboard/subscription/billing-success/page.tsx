'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

export default function BillingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authKey = searchParams.get('authKey')
    const customerKey = searchParams.get('customerKey')
    const subscriptionId = searchParams.get('subscriptionId')

    if (!authKey || !customerKey || !subscriptionId) {
      setError('필수 파라미터가 누락되었습니다.')
      setProcessing(false)
      return
    }

    const issueBillingKey = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          throw new Error('로그인이 필요합니다.')
        }

        // Supabase Function 호출하여 빌링키 발급
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/toss-billing-auth`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customerKey,
              authKey,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '빌링키 발급에 실패했습니다.')
        }

        const data = await response.json()
        console.log('Billing key issued:', data)

        setProcessing(false)

        // 3초 후 결제 히스토리 페이지로 이동
        setTimeout(() => {
          router.push('/dashboard/payments')
        }, 3000)
      } catch (err: any) {
        console.error('Billing auth error:', err)
        setError(err.message)
        setProcessing(false)
      }
    }

    issueBillingKey()
  }, [searchParams, router])

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">결제 수단을 등록하는 중...</p>
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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">등록 실패</h2>
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
          <h2 className="mt-4 text-2xl font-bold text-gray-900">등록 완료!</h2>
          <p className="mt-2 text-gray-600">
            결제 수단이 성공적으로 등록되었습니다.
            <br />
            7일 무료 체험을 시작합니다.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            잠시 후 결제 히스토리 페이지로 이동합니다...
          </p>
        </div>
      </div>
    </div>
  )
}
