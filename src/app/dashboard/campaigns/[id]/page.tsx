import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import CampaignPerformanceMetrics from '@/components/campaigns/CampaignPerformanceMetrics'
import CampaignPerformanceCharts from '@/components/campaigns/CampaignPerformanceCharts'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    redirect('/dashboard')
  }

  // Get campaign with ad account info
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      ad_accounts (
        id,
        platform,
        account_name
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !campaign) {
    notFound()
  }

  // Verify same hospital
  if (campaign.company_id !== userProfile.company_id) {
    redirect('/dashboard/campaigns')
  }

  // Get performance metrics for this campaign
  const { data: metrics } = await supabase
    .from('campaign_performance')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('date', { ascending: false })
    .limit(30) // Last 30 days

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', label: '활성' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: '일시중지' },
      completed: { color: 'bg-gray-100 text-gray-800', label: '완료' },
      draft: { color: 'bg-blue-100 text-blue-800', label: '초안' },
    }
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        캠페인 목록으로
      </Link>

      {/* Campaign Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {campaign.campaign_name}
              </h1>
              {getStatusBadge(campaign.status)}
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">플랫폼:</span>{' '}
                {campaign.ad_accounts?.account_name || '-'} (
                {campaign.ad_accounts?.platform || '-'})
              </p>
              <p>
                <span className="font-medium">목표:</span> {campaign.objective}
              </p>
              {campaign.budget && (
                <p>
                  <span className="font-medium">예산:</span> ₩
                  {new Intl.NumberFormat('ko-KR').format(campaign.budget)} (
                  {campaign.budget_type === 'daily' ? '일일' : '총'})
                </p>
              )}
              {campaign.start_date && (
                <p>
                  <span className="font-medium">기간:</span>{' '}
                  {new Date(campaign.start_date).toLocaleDateString('ko-KR')}
                  {campaign.end_date &&
                    ` ~ ${new Date(campaign.end_date).toLocaleDateString('ko-KR')}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/campaigns/${campaign.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              수정
            </Link>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <CampaignPerformanceMetrics metrics={metrics || []} campaign={campaign} />

      {/* Performance Charts */}
      <CampaignPerformanceCharts metrics={metrics || []} campaign={campaign} />

      {/* Performance Data Table */}
      {metrics && metrics.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              일별 성과 데이터
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      노출
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      클릭
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CTR
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      전환
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      지출
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      CPC
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric: any) => (
                    <tr key={metric.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(metric.date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {new Intl.NumberFormat('ko-KR').format(metric.impressions || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {new Intl.NumberFormat('ko-KR').format(metric.clicks || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {metric.impressions > 0
                          ? ((metric.clicks / metric.impressions) * 100).toFixed(2)
                          : '0.00'}
                        %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {new Intl.NumberFormat('ko-KR').format(metric.conversions || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ₩{new Intl.NumberFormat('ko-KR').format(metric.spend || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        ₩
                        {metric.clicks > 0
                          ? new Intl.NumberFormat('ko-KR').format(
                              Math.round(metric.spend / metric.clicks)
                            )
                          : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {(!metrics || metrics.length === 0) && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">성과 데이터 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            아직 수집된 성과 데이터가 없습니다. 광고 플랫폼과 동기화하면 데이터가
            표시됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
