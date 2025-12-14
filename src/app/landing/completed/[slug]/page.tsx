import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import CloseWindowButton from './CloseWindowButton'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}

// Create a Supabase client with service role for public pages
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Fetch landing page info
async function fetchLandingPage(slug: string) {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('id, slug, title, success_message, completion_info_message, primary_color, company_id, completion_bg_image, completion_bg_color')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('Error fetching landing page for completed:', error)
    return null
  }
  if (!data) return null
  return data
}

// Generate metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const landingPage = await fetchLandingPage(slug)

  if (!landingPage) {
    return {
      title: '신청 완료',
    }
  }

  return {
    title: `신청 완료 - ${landingPage.title}`,
    description: '신청이 성공적으로 완료되었습니다.',
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function CompletedPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { ref } = await searchParams
  const landingPage = await fetchLandingPage(slug)

  // 랜딩페이지를 찾지 못해도 기본 완료 페이지 표시 (404 대신)
  const primaryColor = landingPage?.primary_color || '#3B82F6'
  const successMessage = landingPage?.success_message || '신청이 완료되었습니다. 곧 연락드리겠습니다.'
  const completionInfoMessage = landingPage?.completion_info_message || '담당자가 빠른 시일 내에 연락드릴 예정입니다.\n문의사항이 있으시면 언제든지 연락해 주세요.'
  const completionBgImage = landingPage?.completion_bg_image
  const completionBgColor = landingPage?.completion_bg_color || '#5b8def'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with background image or color */}
          <div
            className="py-12 px-6 text-center relative"
            style={{
              backgroundImage: completionBgImage ? `url(${completionBgImage})` : 'none',
              backgroundColor: completionBgImage ? 'transparent' : completionBgColor,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              {landingPage?.title || '랜딩 페이지'}
            </h1>
            <p className="text-lg font-semibold text-white drop-shadow-md">
              {successMessage}
            </p>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Info Box */}
            <div className="bg-blue-50 rounded-xl p-5 mb-6 border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {completionInfoMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {landingPage && (
                <Link
                  href={`/landing/${slug}${ref ? `?ref=${ref}` : ''}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium text-gray-700 bg-gray-100 transition-all hover:bg-gray-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  페이지로 돌아가기
                </Link>
              )}
              <CloseWindowButton primaryColor={primaryColor} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Helper function to darken/lighten color
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
