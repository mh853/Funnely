import { createClient, getCachedUser, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPagesClient from './LandingPagesClient'
import { getLeadStatusCategoryMap } from '@/lib/leadStatusCategory'

// force-dynamic: authenticated dashboard page — ISR causes stale data and chunk mismatch errors on dev server restart
export const dynamic = 'force-dynamic'

export default async function LandingPagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await getCachedUser()

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

  // company short_id와 랜딩페이지 목록은 서로 무관하므로 병렬로 조회
  const [{ data: companyShortIdData }, { data: landingPages }] = await Promise.all([
    supabase
      .from('companies')
      .select('short_id')
      .eq('id', userProfile.company_id)
      .maybeSingle(),
    supabase
      .from('landing_pages')
      .select('id, title, slug, is_active, created_at, views_count, company_id, timer_enabled, timer_deadline, timer_auto_update')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false }),
  ])

  const companyShortId = companyShortIdData?.short_id || null

  // range()/limit() 없이 조회하면 supabase/config.toml의 max_rows(1000)가 암묵적으로
  // 적용돼 결과가 잘린다(dashboard/page.tsx 등 이미 여러 곳에서 겪은 문제) - 리드가
  // 1000건을 넘는 회사는 목록의 DB유입/거절/확정 카운트가 조용히 과소집계됐다(85차 QA).
  async function fetchAllRows<T>(
    queryBuilder: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }
  ): Promise<T[]> {
    const BATCH_SIZE = 1000
    const allRows: T[] = []
    let offset = 0
    while (true) {
      const { data, error } = await queryBuilder.range(offset, offset + BATCH_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allRows.push(...data)
      if (data.length < BATCH_SIZE) break
      offset += BATCH_SIZE
    }
    return allRows
  }

  // 리드 통계와 상태 범주 맵은 서로 무관하므로 병렬로 조회
  const [leadsStats, leadStatusCategoryMap] = await Promise.all([
    fetchAllRows(
      supabase
        .from('leads')
        .select('landing_page_id, status, created_at')
        .in('landing_page_id', (landingPages || []).map(p => p.id))
    ),
    getLeadStatusCategoryMap(supabase, userProfile.company_id),
  ])

  // Aggregate statistics by landing page ID
  const statsMap = new Map<string, { dbInflow: number; rejectedCount: number; contractCount: number }>()

  leadsStats?.forEach(lead => {
    const pageId = lead.landing_page_id
    if (!statsMap.has(pageId)) {
      statsMap.set(pageId, { dbInflow: 0, rejectedCount: 0, contractCount: 0 })
    }
    const stats = statsMap.get(pageId)!
    stats.dbInflow++
    const category = leadStatusCategoryMap[lead.status] || 'other'
    if (category === 'rejected') stats.rejectedCount++
    if (category === 'contract_completed') stats.contractCount++
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
