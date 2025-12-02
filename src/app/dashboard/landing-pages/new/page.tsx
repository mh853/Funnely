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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/landing-pages"
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold">랜딩페이지 만들기</h1>
              <p className="mt-2 text-indigo-100">
                DB 수집을 위한 랜딩페이지를 만들어보세요
              </p>
            </div>
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
