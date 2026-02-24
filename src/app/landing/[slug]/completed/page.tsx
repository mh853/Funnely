import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// /landing/[slug]/completed → /[companyShortId]/landing/[slug]/completed
export default async function LandingCompletedRedirect({ params }: Props) {
  const { slug } = await params
  const supabase = getServiceRoleClient()

  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('slug, companies!inner(short_id)')
    .eq('slug', slug)
    .single()

  if (!landingPage) {
    notFound()
  }

  const companyShortId = (landingPage.companies as any)?.short_id
  if (!companyShortId) {
    notFound()
  }

  redirect(`/${companyShortId}/landing/${slug}/completed`)
}
