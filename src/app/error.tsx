'use client'

// 렌더링 중 발생한 예외를 잡아 기본 크래시 화면 대신 보여주는 에러 바운더리
import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">오류</h1>
        <p className="text-xl text-gray-600 mb-8">문제가 발생했습니다</p>
        <p className="text-sm text-gray-500 mb-8">
          일시적인 오류로 페이지를 표시할 수 없습니다. 잠시 후 다시 시도해주세요.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
