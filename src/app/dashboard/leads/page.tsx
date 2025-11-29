import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import LeadsClient from './LeadsClient'

interface SearchParams {
  dateRange?: string
  landingPageId?: string
  deviceType?: string
  status?: string
  search?: string
  page?: string
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
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

  // Parse search params
  const dateRange = searchParams.dateRange || '7days'
  const landingPageId = searchParams.landingPageId
  const deviceType = searchParams.deviceType
  const status = searchParams.status
  const search = searchParams.search
  const page = Number(searchParams.page) || 1
  const pageSize = 20

  // Calculate date range
  const now = new Date()
  let startDate: Date | null = null

  switch (dateRange) {
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '14days':
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      break
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'all':
      startDate = null
      break
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  // Build query
  let query = supabase
    .from('leads')
    .select(
      `
      *,
      landing_pages (
        id,
        title,
        slug
      )
    `,
      { count: 'exact' }
    )
    .eq('company_id', userProfile.company_id)

  // Apply filters
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }

  if (landingPageId) {
    query = query.eq('landing_page_id', landingPageId)
  }

  if (deviceType) {
    query = query.eq('device_type', deviceType)
  }

  if (status) {
    if (status === 'new') {
      query = query.in('status', ['new', 'pending'])
    } else if (status === 'contacted') {
      query = query.in('status', ['contacted', 'qualified'])
    } else {
      query = query.eq('status', status)
    }
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  // Get total count and paginated data
  const { data: leads, count: totalCount } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  // Get landing pages for filter
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('id, title')
    .eq('company_id', userProfile.company_id)
    .order('title')

  const handleExcelExport = async () => {
    'use server'
    // Excel export implementation will be added later
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">DB 현황</h1>
            <p className="mt-2 text-indigo-100">
              랜딩페이지에서 수집된 고객 DB를 관리하세요
            </p>
          </div>
          <button
            onClick={handleExcelExport}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Excel
          </button>
        </div>
      </div>

      <LeadsClient
        leads={leads || []}
        landingPages={landingPages || []}
        totalCount={totalCount || 0}
      />
    </div>
  )
}
