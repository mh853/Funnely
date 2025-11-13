'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AdAccount {
  id: string
  platform: string
  account_name: string
  status: string
}

interface CreateCampaignModalProps {
  adAccounts: AdAccount[]
  onClose: () => void
}

export default function CreateCampaignModal({
  adAccounts,
  onClose,
}: CreateCampaignModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    adAccountId: adAccounts[0]?.id || '',
    campaignName: '',
    objective: 'traffic',
    status: 'draft',
    budget: '',
    budgetType: 'daily',
    startDate: '',
    endDate: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_account_id: formData.adAccountId,
          campaign_name: formData.campaignName,
          objective: formData.objective,
          status: formData.status,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          budget_type: formData.budgetType,
          start_date: formData.startDate || null,
          end_date: formData.endDate || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '캠페인 생성에 실패했습니다.')
      }

      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || '캠페인 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <Dialog.Title className="text-lg font-medium text-gray-900">
              캠페인 생성
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Ad Account */}
            <div>
              <label htmlFor="adAccountId" className="block text-sm font-medium text-gray-700">
                광고 계정 <span className="text-red-500">*</span>
              </label>
              <select
                name="adAccountId"
                id="adAccountId"
                required
                value={formData.adAccountId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {adAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} ({account.platform})
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign Name */}
            <div>
              <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700">
                캠페인명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="campaignName"
                id="campaignName"
                required
                value={formData.campaignName}
                onChange={handleChange}
                placeholder="예: 2024 봄 이벤트 캠페인"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* Objective */}
            <div>
              <label htmlFor="objective" className="block text-sm font-medium text-gray-700">
                캠페인 목표 <span className="text-red-500">*</span>
              </label>
              <select
                name="objective"
                id="objective"
                required
                value={formData.objective}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="traffic">트래픽</option>
                <option value="conversions">전환</option>
                <option value="brand_awareness">브랜드 인지도</option>
                <option value="reach">도달</option>
                <option value="engagement">참여</option>
                <option value="app_installs">앱 설치</option>
                <option value="lead_generation">리드 생성</option>
              </select>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                  예산 (₩)
                </label>
                <input
                  type="number"
                  name="budget"
                  id="budget"
                  min="0"
                  step="1000"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="10000"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="budgetType" className="block text-sm font-medium text-gray-700">
                  예산 유형
                </label>
                <select
                  name="budgetType"
                  id="budgetType"
                  value={formData.budgetType}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="daily">일일</option>
                  <option value="total">총</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  시작일
                </label>
                <input
                  type="date"
                  name="startDate"
                  id="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  종료일
                </label>
                <input
                  type="date"
                  name="endDate"
                  id="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                상태 <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                id="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="draft">초안</option>
                <option value="active">활성</option>
                <option value="paused">일시중지</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                초안으로 저장하고 나중에 활성화할 수 있습니다.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '캠페인 생성'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
