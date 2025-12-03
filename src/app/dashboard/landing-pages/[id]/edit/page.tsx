import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import LandingPageFormSkeleton from '@/components/landing-pages/LandingPageFormSkeleton'

// Dynamic import for large form component
const LandingPageNewForm = dynamic(
  () => import('@/components/landing-pages/LandingPageNewForm'),
  {
    loading: () => <LandingPageFormSkeleton />,
    ssr: false,
  }
)

interface Props {
  params: { id: string }
}

// ISR: Revalidate every 1 minute for edit page
export const revalidate = 60

export default async function LandingPageEditPage({ params }: Props) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get landing page with all details
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', userProfile.company_id)
    .single()

  if (error || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            랜딩 페이지를 찾을 수 없습니다
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            존재하지 않거나 접근 권한이 없는 페이지입니다.
          </p>
          <Link
            href="/dashboard/landing-pages"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - 모바일 최적화 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard/landing-pages"
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold truncate">랜딩페이지 수정</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-base text-indigo-100 truncate">
              랜딩페이지 설정을 수정하고 업데이트하세요
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <LandingPageNewForm
        landingPage={landingPage}
        companyId={userProfile.company_id}
        userId={user.id}
      />
    </div>
  )
}
