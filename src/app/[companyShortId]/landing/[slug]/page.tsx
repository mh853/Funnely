import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import PublicLandingPage from '@/components/landing-pages/PublicLandingPage'
import { config } from '@/lib/config'
import { LandingPage as LandingPageType } from '@/types/landing-page.types'

interface Props {
  params: Promise<{
    companyShortId: string
    slug: string
  }>
}

// Dynamic rendering to reflect is_active changes immediately
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Create a Supabase client with service role for public landing pages
// Service role bypasses RLS - safe for server components only
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

// Shared function to fetch company and landing page
async function fetchCompanyAndLandingPage(companyShortId: string, slug: string): Promise<any> {
  const supabase = getServiceRoleClient()

  // 1. Fetch company by short_id
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select(`
      id,
      short_id,
      name,
      tracking_pixels(*)
    `)
    .eq('short_id', companyShortId)
    .single()

  if (companyError || !company) return null

  // DEBUG: Log company data structure
  console.log('[DEBUG] Company data:', JSON.stringify(company, null, 2))

  // 2. Fetch landing page for this company + slug
  const { data: landingPage, error: lpError } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('company_id', company.id)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true)
    .single()

  if (lpError || !landingPage) return null

  // Combine company and landing page data
  const combinedData = {
    ...landingPage,
    companies: company
  }

  // DEBUG: Log combined data structure
  console.log('[DEBUG] Combined data:', JSON.stringify(combinedData, null, 2))

  return combinedData
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyShortId, slug } = await params
  const landingPage = await fetchCompanyAndLandingPage(companyShortId, slug)

  if (!landingPage) {
    return {
      title: 'Page Not Found',
    }
  }

  const title = landingPage.meta_title || landingPage.title
  const description = landingPage.meta_description || ''
  const image = landingPage.meta_image || `${config.app.domain}/og-image.png`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function LandingPage({ params }: Props) {
  const { companyShortId, slug } = await params
  const landingPage = await fetchCompanyAndLandingPage(companyShortId, slug)

  if (!landingPage) {
    notFound()
  }

  // Page view tracking is handled by client component (PublicLandingPage)
  // to bypass ISR caching and ensure accurate counts on every visit

  // Pass company short_id as initialRef for backward compatibility
  return <PublicLandingPage landingPage={landingPage} initialRef={companyShortId} />
}
