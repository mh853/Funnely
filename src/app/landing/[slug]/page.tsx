import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import PublicLandingPage from '@/components/landing-pages/PublicLandingPage'
import { config } from '@/lib/config'
import { LandingPage as LandingPageType } from '@/types/landing-page.types'

interface Props {
  params: Promise<{ slug: string }>
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

// Generate static params for popular landing pages (build time only, no auth needed)
export async function generateStaticParams() {
  const supabase = getServiceRoleClient()

  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('slug')
    .eq('status', 'published')
    .eq('is_active', true)
    .limit(10) // Pre-generate top 10 landing pages

  return (landingPages || []).map((page) => ({
    slug: page.slug,
  }))
}

// Shared function to fetch landing page (prevents duplicate queries)
async function fetchLandingPage(slug: string): Promise<any> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select(`
      *,
      companies!inner(
        id,
        tracking_pixels(*)
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const landingPage = await fetchLandingPage(slug)

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
  const { slug } = await params
  const landingPage = await fetchLandingPage(slug)

  if (!landingPage) {
    notFound()
  }

  // Page view tracking is handled by client component (PublicLandingPage)
  // to bypass ISR caching and ensure accurate counts on every visit

  return <PublicLandingPage landingPage={landingPage} />
}
