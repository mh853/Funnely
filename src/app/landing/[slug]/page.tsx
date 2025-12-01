import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import PublicLandingPage from '@/components/landing-pages/PublicLandingPage'
import { config } from '@/lib/config'

interface Props {
  params: { slug: string }
}

// ISR: Revalidate every 60 seconds
export const revalidate = 60

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()

  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('title, meta_title, meta_description, meta_image')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

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
  const supabase = await createClient()

  // Fetch published landing page
  const { data: landingPage, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (error || !landingPage) {
    notFound()
  }

  // Debug: Log collect_fields to understand its structure
  console.log('🔍 Landing Page Data:', {
    slug: landingPage.slug,
    collect_fields: landingPage.collect_fields,
    collect_fields_type: typeof landingPage.collect_fields,
    collect_fields_isArray: Array.isArray(landingPage.collect_fields),
  })

  // Increment view count (fire-and-forget)
  supabase
    .from('landing_pages')
    .update({ views_count: (landingPage.views_count || 0) + 1 })
    .eq('id', landingPage.id)
    .then()

  return <PublicLandingPage landingPage={landingPage} />
}
