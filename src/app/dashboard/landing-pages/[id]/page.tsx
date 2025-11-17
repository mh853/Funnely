import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  PencilIcon,
  EyeIcon,
  TrashIcon,
  ArrowLeftIcon,
  GlobeAltIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import LandingPageEditor from '@/components/landing-pages/LandingPageEditor'
import { getLandingPageUrl } from '@/lib/config'

interface Props {
  params: { id: string }
}

export default async function LandingPageDetailPage({ params }: Props) {
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

  // Get landing page
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', params.id)
    .eq('hospital_id', userProfile.hospital_id)
    .single()

  if (error || !landingPage) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">랜딩 페이지를 찾을 수 없습니다.</p>
        <Link
          href="/dashboard/landing-pages"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500"
        >
          <ArrowLeftIcon className="mr-2 h-5 w-5" />
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/landing-pages"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{landingPage.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {landingPage.status === 'published' ? (
                <span className="inline-flex items-center">
                  <GlobeAltIcon className="mr-1 h-4 w-4" />
                  {getLandingPageUrl(landingPage.slug).replace('https://', '')}
                </span>
              ) : (
                <span className="text-gray-500">초안</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {landingPage.status === 'published' && (
            <a
              href={getLandingPageUrl(landingPage.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="-ml-1 mr-2 h-5 w-5" />
              미리보기
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">조회수</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {landingPage.views_count?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">신청수</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {landingPage.submissions_count?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전환율</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {landingPage.views_count > 0
                      ? ((landingPage.submissions_count / landingPage.views_count) * 100).toFixed(
                          2
                        )
                      : 0}
                    %
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <LandingPageEditor
        landingPage={landingPage}
        hospitalId={userProfile.hospital_id}
        userId={user.id}
      />
    </div>
  )
}
