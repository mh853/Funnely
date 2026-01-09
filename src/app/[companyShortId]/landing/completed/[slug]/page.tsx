import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import CloseWindowButton from '@/app/landing/completed/[slug]/CloseWindowButton'
import CompletionTracker from '@/components/tracking/CompletionTracker'

interface Props {
  params: Promise<{
    companyShortId: string
    slug: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Force dynamic to prevent caching and ensure fresh data
export const dynamic = 'force-dynamic'

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `신청 완료 - ${slug}`,
    description: '신청이 성공적으로 완료되었습니다.',
  }
}

export default async function CompletedPage({ params }: Props) {
  const { companyShortId, slug } = await params
  const supabase = getServiceRoleClient()

  // Fetch company by short_id with tracking_pixels
  const { data: company } = await supabase
    .from('companies')
    .select(`
      id,
      short_id,
      name,
      tracking_pixels(*)
    `)
    .eq('short_id', companyShortId)
    .single()

  if (!company) {
    notFound()
  }

  // Fetch landing page
  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('id, slug, title, success_message, completion_info_message, theme, company_id, completion_bg_image, completion_bg_color')
    .eq('company_id', company.id)
    .eq('slug', slug)
    .single()

  if (!landingPage) {
    notFound()
  }

  // Extract tracking pixels (handle both object and array formats)
  const trackingPixelsRaw = (company as any).tracking_pixels
  const trackingPixels = Array.isArray(trackingPixelsRaw)
    ? trackingPixelsRaw[0]
    : trackingPixelsRaw

  const successMessage = landingPage.success_message || '신청이 완료되었습니다!'
  const infoMessage = landingPage.completion_info_message || '빠른 시일 내에 연락드리겠습니다.'
  const primaryColor = landingPage.theme?.colors?.primary || '#10b981' // Default green color

  return (
    <>
      {/* Tracking Pixels for Completion */}
      <CompletionTracker trackingPixels={trackingPixels} />

      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: landingPage.completion_bg_image
            ? `url(${landingPage.completion_bg_image}) center/cover no-repeat`
            : landingPage.completion_bg_color || '#f9fafb'
        }}
      >
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {successMessage}
          </h1>

          {/* Info Message */}
          <p className="text-gray-600 mb-8 whitespace-pre-wrap">
            {infoMessage}
          </p>

          {/* Close Window Button */}
          <CloseWindowButton primaryColor={primaryColor} />
        </div>
      </div>
    </>
  )
}
