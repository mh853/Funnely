import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
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
export default async function LandingCompletedRedirect({ params, searchParams }: Props) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
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

  // 쿼리스트링(특히 ?duplicate=1 - 중복제출/블랙리스트 차단 시 전환픽셀 재발화를
  // 막는 마커)을 유실하면 안 된다. 서브도메인/커스텀도메인 경로는 middleware.ts의
  // rewrite가 쿼리를 보존하지만, 이 파일이 처리하는 메인 도메인 직접 접근 경로는
  // 이 redirect()가 유일한 전달 지점이었다(52차 QA 라이브 확인).
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const queryString = query.toString()
  redirect(`/${companyShortId}/landing/${slug}/completed${queryString ? `?${queryString}` : ''}`)
}
