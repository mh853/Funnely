import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import LandingPageCard from '@/components/landing-pages/LandingPageCard'

export default async function LandingPagesPage() {
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

  // Get landing pages
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('hospital_id', userProfile.hospital_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">랜딩 페이지</h1>
          <p className="mt-1 text-sm text-gray-600">
            DB 수집용 랜딩 페이지를 만들고 관리합니다.
          </p>
        </div>
        <Link
          href="/dashboard/landing-pages/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          새 랜딩 페이지
        </Link>
      </div>

      {/* Landing Pages List */}
      {!landingPages || landingPages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">랜딩 페이지 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            DB 수집을 위한 첫 랜딩 페이지를 만들어보세요.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/landing-pages/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              랜딩 페이지 만들기
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {landingPages.map((page: any) => (
            <LandingPageCard key={page.id} page={page} />
          ))}
        </div>
      )}
    </div>
  )
}
