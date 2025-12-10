import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  EyeIcon,
  ArrowLeftIcon,
  GlobeAltIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import LandingPageEditor from '@/components/landing-pages/LandingPageEditor'
import { getLandingPageUrl, getLandingPageBaseUrl } from '@/lib/config'
import RefLinkCopyButton from '@/components/landing-pages/RefLinkCopyButton'

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

  // Get user short_id for ref parameter
  const { data: userShortId } = await supabase
    .from('users')
    .select('short_id')
    .eq('id', user.id)
    .single()

  // Get landing page
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', userProfile.company_id)
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - 모바일 최적화 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard/landing-pages"
            className="text-gray-400 hover:text-gray-600 p-1 -ml-1"
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{landingPage.title}</h1>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 truncate">
              {landingPage.status === 'published' ? (
                <span className="inline-flex items-center">
                  <GlobeAltIcon className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{getLandingPageUrl(landingPage.slug).replace('https://', '')}</span>
                </span>
              ) : (
                <span className="text-gray-500">초안</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-8 sm:ml-0">
          {landingPage.status === 'published' && (
            <>
              <RefLinkCopyButton
                baseUrl={getLandingPageBaseUrl()}
                slug={landingPage.slug}
                shortId={userShortId?.short_id}
              />
              <a
                href={getLandingPageUrl(landingPage.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                미리보기
              </a>
            </>
          )}
        </div>
      </div>

      {/* Stats - 모바일 최적화 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <div className="bg-white overflow-hidden shadow rounded-xl">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="hidden sm:block flex-shrink-0">
                <EyeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">조회수</dt>
                  <dd className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5">
                    {landingPage.views_count?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-xl">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="hidden sm:block flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">신청수</dt>
                  <dd className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5">
                    {landingPage.submissions_count?.toLocaleString() || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-xl">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="hidden sm:block flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">전환율</dt>
                  <dd className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5">
                    {landingPage.views_count > 0
                      ? ((landingPage.submissions_count / landingPage.views_count) * 100).toFixed(
                          1
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
        companyId={userProfile.company_id}
        userId={user.id}
      />
    </div>
  )
}
