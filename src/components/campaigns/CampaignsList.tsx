'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import EditCampaignModal from './EditCampaignModal'
import DeleteCampaignModal from './DeleteCampaignModal'

interface AdAccount {
  id: string
  platform: string
  account_name: string
  status: string
}

interface Campaign {
  id: string
  campaign_id: string
  campaign_name: string
  objective: string
  status: string
  budget: number | null
  budget_type: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  ad_accounts: {
    id: string
    platform: string
    account_name: string
  } | null
}

interface CampaignsListProps {
  campaigns: Campaign[]
  canManage: boolean
  adAccounts: AdAccount[]
}

export default function CampaignsList({
  campaigns,
  canManage,
  adAccounts,
}: CampaignsListProps) {
  const router = useRouter()
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)

  const getPlatformBadge = (platform: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      meta: { color: 'bg-blue-100 text-blue-800', label: 'Meta' },
      kakao: { color: 'bg-yellow-100 text-yellow-800', label: 'Kakao' },
      google: { color: 'bg-red-100 text-red-800', label: 'Google' },
    }
    const badge = badges[platform] || { color: 'bg-gray-100 text-gray-800', label: platform }
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800', label: '활성' },
      paused: { color: 'bg-yellow-100 text-yellow-800', label: '일시중지' },
      completed: { color: 'bg-gray-100 text-gray-800', label: '완료' },
      draft: { color: 'bg-blue-100 text-blue-800', label: '초안' },
    }
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const formatBudget = (budget: number | null, budgetType: string | null) => {
    if (!budget) return '-'
    const formatted = new Intl.NumberFormat('ko-KR').format(budget)
    const type = budgetType === 'daily' ? '일' : '총'
    return `₩${formatted} (${type})`
  }

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return '기간 미설정'
    const start = new Date(startDate).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    if (!endDate) return `${start} ~`
    const end = new Date(endDate).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return `${start} ~ ${end}`
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            캠페인 목록 ({campaigns.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    캠페인명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    플랫폼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    목표
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    예산
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  {canManage && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.campaign_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {campaign.ad_accounts?.account_name || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.ad_accounts && getPlatformBadge(campaign.ad_accounts.platform)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.objective || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBudget(campaign.budget, campaign.budget_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateRange(campaign.start_date, campaign.end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                          className="text-purple-600 hover:text-purple-900 inline-flex items-center"
                          title="성과 보기"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingCampaign(campaign)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                          title="수정"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCampaign(campaign)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center"
                          title="삭제"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          adAccounts={adAccounts}
          onClose={() => setEditingCampaign(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingCampaign && (
        <DeleteCampaignModal
          campaign={deletingCampaign}
          onClose={() => setDeletingCampaign(null)}
        />
      )}
    </>
  )
}
