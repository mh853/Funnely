'use client'

import { useRouter } from 'next/navigation'

export default function BillingFailPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <span className="text-red-600 text-3xl">✕</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">결제 수단 등록 실패</h2>
          <p className="mt-2 text-gray-600">
            결제 수단 등록 중 문제가 발생했습니다.
            <br />
            다시 시도해 주세요.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => router.push('/dashboard/subscription')}
              className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700"
            >
              다시 시도하기
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-100 text-gray-700 rounded-lg px-6 py-3 font-semibold hover:bg-gray-200"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
