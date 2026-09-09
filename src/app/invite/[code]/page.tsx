import { Suspense } from 'react'
import type { Metadata } from 'next'
import InviteAcceptClient from './InviteAcceptClient'

// 팀 초대 수락 페이지 - 회원가입/로그인과 같은 인증 흐름이라 검색 색인 제외 (노션 37번)
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

interface PageProps {
  params: Promise<{ code: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { code } = await params

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Funnely 팀 초대
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          초대를 수락하고 팀에 합류하세요
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <InviteAcceptClient code={code} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
