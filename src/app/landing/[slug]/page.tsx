import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import PublicLandingPage from '@/components/landing-pages/PublicLandingPage'
import { config } from '@/lib/config'
import { LandingPage as LandingPageType } from '@/types/landing-page.types'

interface Props {
  params: Promise<{ slug: string }>
}

// ISR: Revalidate every 5 minutes for better performance
export const revalidate = 300

// Create a public Supabase client (no cookies needed for public landing pages)
function getPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Generate static params for popular landing pages (build time only, no auth needed)
export async function generateStaticParams() {
  const supabase = getPublicSupabaseClient()

  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('slug')
    .eq('is_active', true)
    .limit(10) // Pre-generate top 10 landing pages

  return (landingPages || []).map((page) => ({
    slug: page.slug,
  }))
}

// Shared function to fetch landing page (prevents duplicate queries)
async function fetchLandingPage(slug: string): Promise<LandingPageType | null> {
  const supabase = getPublicSupabaseClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as LandingPageType
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

  // Increment view count asynchronously (non-blocking)
  const supabase = getPublicSupabaseClient()
  void supabase
    .from('landing_pages')
    .update({ views_count: (landingPage.views_count || 0) + 1 })
    .eq('id', landingPage.id)

  return <PublicLandingPage landingPage={landingPage} />
}
