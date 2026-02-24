import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPagesClient from './LandingPagesClient'

// force-dynamic: authenticated dashboard page — ISR causes stale data and chunk mismatch errors on dev server restart
export const dynamic = 'force-dynamic'

export default async function LandingPagesPage() {
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

  // Get company short_id for ref parameter
  const { data: companyShortIdData } = await supabase
    .from('companies')
    .select('short_id')
    .eq('id', userProfile.company_id)
    .single()

  const companyShortId = companyShortIdData?.short_id || null

  // Get all landing pages (no date filtering)
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('id, title, slug, is_active, created_at, views_count, company_id, timer_enabled, timer_deadline, timer_auto_update')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })

  // Get all leads statistics in a single query (prevents N+1 problem)
  const { data: leadsStats } = await supabase
    .from('leads')
    .select('landing_page_id, status, created_at')
    .in('landing_page_id', (landingPages || []).map(p => p.id))

  // Aggregate statistics by landing page ID
  const statsMap = new Map<string, { dbInflow: number; rejectedCount: number; contractCount: number }>()

  leadsStats?.forEach(lead => {
    const pageId = lead.landing_page_id
    if (!statsMap.has(pageId)) {
      statsMap.set(pageId, { dbInflow: 0, rejectedCount: 0, contractCount: 0 })
    }
    const stats = statsMap.get(pageId)!
    stats.dbInflow++
    if (lead.status === 'rejected') stats.rejectedCount++
    if (lead.status === 'contract_completed') stats.contractCount++
  })

  // Combine landing pages with their statistics
  const landingPagesWithStats = (landingPages || []).map(page => {
    const stats = statsMap.get(page.id) || { dbInflow: 0, rejectedCount: 0, contractCount: 0 }
    return {
      ...page,
      pageViews: page.views_count || 0,
      dbInflow: stats.dbInflow,
      rejectedCount: stats.rejectedCount,
      contractCount: stats.contractCount,
      timer_enabled: page.timer_enabled ?? false,
      timer_deadline: page.timer_deadline ?? null,
      timer_auto_update: page.timer_auto_update ?? false,
    }
  })

  return (
    <LandingPagesClient
      landingPages={landingPagesWithStats}
      companyShortId={companyShortId}
    />
  )
}
