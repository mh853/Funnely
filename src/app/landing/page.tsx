import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'
import PublicLandingPage from '@/components/landing-pages/PublicLandingPage'
import { config } from '@/lib/config'
import { LandingPage as LandingPageType } from '@/types/landing-page.types'

interface Props {
  searchParams: Promise<{ ref?: string; [key: string]: string | string[] | undefined }>
}

// Create a Supabase client with service role for public landing pages
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

// Parse ref parameter to extract shortId and slug
// Format: ref=abc123/slug or ref=abc123
function parseRefParam(ref: string | undefined): { shortId: string | null; slug: string | null } {
  if (!ref) {
    return { shortId: null, slug: null }
  }

  // Check if ref contains a slash (format: shortId/slug)
  if (ref.includes('/')) {
    const parts = ref.split('/')
    return {
      shortId: parts[0] || null,
      slug: parts.slice(1).join('/') || null
    }
  }

  // Legacy format: just shortId
  return { shortId: ref, slug: null }
}

// Shared function to fetch landing page
async function fetchLandingPage(slug: string): Promise<LandingPageType | null> {
  const supabase = getServiceRoleClient()

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) return null
  return data as LandingPageType
}

// Generate metadata for SEO
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const { slug } = parseRefParam(params.ref)

  if (!slug) {
    return {
      title: 'Landing Page',
    }
  }

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

export default async function LandingPageWithRef({ searchParams }: Props) {
  const params = await searchParams
  const { shortId, slug } = parseRefParam(params.ref)

  // If no slug in ref parameter, show 404
  if (!slug) {
    notFound()
  }

  const landingPage = await fetchLandingPage(slug)

  if (!landingPage) {
    notFound()
  }

  // Pass shortId as ref to PublicLandingPage for tracking
  return <PublicLandingPage landingPage={landingPage} initialRef={shortId || undefined} />
}
