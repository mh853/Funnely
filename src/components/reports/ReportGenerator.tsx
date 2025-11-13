'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface Campaign {
  id: string
  campaign_name: string
  status: string
  ad_accounts: {
    platform: string
    account_name: string
  } | null
}

interface ReportGeneratorProps {
  campaigns: Campaign[]
  hospitalId: string
}

export default function ReportGenerator({ campaigns, hospitalId }: ReportGeneratorProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    reportType: 'campaign_summary',
    format: 'excel',
    campaignIds: [] as string[],
    startDate: '',
    endDate: '',
    includedMetrics: ['impressions', 'clicks', 'spend', 'conversions'],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement
      const metricValue = checkbox.value

      setFormData((prev) => ({
        ...prev,
        includedMetrics: checkbox.checked
          ? [...prev.includedMetrics, metricValue]
          : prev.includedMetrics.filter((m) => m !== metricValue),
      }))
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
    setError(null)
  }

  const handleCampaignSelect = (campaignId: string) => {
    setFormData((prev) => ({
      ...prev,
      campaignIds: prev.campaignIds.includes(campaignId)
        ? prev.campaignIds.filter((id) => id !== campaignId)
        : [...prev.campaignIds, campaignId],
    }))
  }

  const handleSelectAllCampaigns = () => {
    if (formData.campaignIds.length === campaigns.length) {
      setFormData((prev) => ({ ...prev, campaignIds: [] }))
    } else {
      setFormData((prev) => ({ ...prev, campaignIds: campaigns.map((c) => c.id) }))
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hospitalId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '리포트 생성에 실패했습니다.')
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${new Date().toISOString().split('T')[0]}.${
        formData.format === 'excel' ? 'xlsx' : 'pdf'
      }`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      router.refresh()
    } catch (err: any) {
      setError(err.message || '리포트 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
          리포트 생성
        </h3>

        <div className="space-y-6">
          {/* Report Type */}
          <div>
            <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">
              리포트 유형
            </label>
            <select
              name="reportType"
              id="reportType"
              value={formData.reportType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="campaign_summary">캠페인 요약</option>
              <option value="performance_detail">성과 상세</option>
              <option value="budget_analysis">예산 분석</option>
              <option value="conversion_report">전환 리포트</option>
            </select>
          </div>

          {/* Format */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700">
              파일 형식
            </label>
            <select
              name="format"
              id="format"
              value={formData.format}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">기간</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Campaign Selection */}
          {campaigns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">캠페인 선택</label>
                <button
                  type="button"
                  onClick={handleSelectAllCampaigns}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {formData.campaignIds.length === campaigns.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {campaigns.map((campaign) => (
                  <label
                    key={campaign.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.campaignIds.includes(campaign.id)}
                      onChange={() => handleCampaignSelect(campaign.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900">
                      {campaign.campaign_name}
                      <span className="text-gray-500 ml-2">
                        ({campaign.ad_accounts?.platform || '-'})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">포함할 지표</label>
            <div className="space-y-2">
              {[
                { value: 'impressions', label: '노출수' },
                { value: 'clicks', label: '클릭수' },
                { value: 'spend', label: '지출' },
                { value: 'conversions', label: '전환' },
                { value: 'ctr', label: 'CTR (클릭률)' },
                { value: 'cpc', label: 'CPC (클릭당 비용)' },
                { value: 'cpa', label: 'CPA (전환당 비용)' },
              ].map((metric) => (
                <label key={metric.value} className="flex items-center">
                  <input
                    type="checkbox"
                    value={metric.value}
                    checked={formData.includedMetrics.includes(metric.value)}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{metric.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || formData.campaignIds.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {generating ? '생성 중...' : '리포트 생성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
