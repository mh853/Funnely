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

// ISR: Revalidate every 1 minute for new page
export const revalidate = 60

export default async function NewLandingPagePage() {
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

  return (
    <div className="px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/landing-pages"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">랜딩페이지 만들기</h1>
            <p className="text-xs text-gray-500 mt-0.5">DB 수집을 위한 랜딩페이지를 만들어보세요</p>
          </div>
        </div>
      </div>

      {/* New Form */}
      <LandingPageNewForm
        companyId={userProfile.company_id}
        userId={user.id}
      />
    </div>
  )
}
