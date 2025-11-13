'use client'

import {
  EyeIcon,
  CursorArrowRaysIcon,
  BanknotesIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'

interface PerformanceMetric {
  id: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  date: string
}

interface CampaignPerformanceMetricsProps {
  metrics: PerformanceMetric[]
  campaign: any
}

export default function CampaignPerformanceMetrics({
  metrics,
  campaign,
}: CampaignPerformanceMetricsProps) {
  // Calculate totals
  const totals = metrics.reduce(
    (acc, metric) => ({
      impressions: acc.impressions + (metric.impressions || 0),
      clicks: acc.clicks + (metric.clicks || 0),
      spend: acc.spend + (metric.spend || 0),
      conversions: acc.conversions + (metric.conversions || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
  )

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0
  const conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0

  const stats = [
    {
      name: '총 노출수',
      value: new Intl.NumberFormat('ko-KR').format(totals.impressions),
      icon: EyeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: '총 클릭수',
      value: new Intl.NumberFormat('ko-KR').format(totals.clicks),
      subValue: `CTR: ${ctr.toFixed(2)}%`,
      icon: CursorArrowRaysIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: '총 지출',
      value: `₩${new Intl.NumberFormat('ko-KR').format(totals.spend)}`,
      subValue: `CPC: ₩${new Intl.NumberFormat('ko-KR').format(Math.round(cpc))}`,
      icon: BanknotesIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: '총 전환',
      value: new Intl.NumberFormat('ko-KR').format(totals.conversions),
      subValue: `전환율: ${conversionRate.toFixed(2)}% | CPA: ₩${new Intl.NumberFormat('ko-KR').format(Math.round(cpa))}`,
      icon: ShoppingCartIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  // Budget utilization
  const budgetUtilization =
    campaign.budget && campaign.budget > 0 ? (totals.spend / campaign.budget) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    </dd>
                    {stat.subValue && (
                      <dd className="text-xs text-gray-500 mt-1">{stat.subValue}</dd>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Budget Progress */}
      {campaign.budget && campaign.budget > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">예산 사용률</h3>
            <span className="text-sm text-gray-500">
              ₩{new Intl.NumberFormat('ko-KR').format(totals.spend)} / ₩
              {new Intl.NumberFormat('ko-KR').format(campaign.budget)}
            </span>
          </div>
          <div className="relative pt-1">
            <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  budgetUtilization >= 90
                    ? 'bg-red-500'
                    : budgetUtilization >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-semibold text-gray-700">
                {budgetUtilization.toFixed(1)}% 사용
              </span>
              {budgetUtilization >= 90 && (
                <span className="text-xs font-semibold text-red-600">⚠️ 예산 거의 소진</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
