'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'

interface AdAccount {
  id: string
  platform: string
  account_id: string
  account_name: string
  is_active: boolean
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  created_at: string
  updated_at: string
}

interface AdAccountsListProps {
  adAccounts: AdAccount[]
  canManage: boolean
}

export default function AdAccountsList({
  adAccounts,
  canManage,
}: AdAccountsListProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState<string | null>(null)

  const handleRefresh = async (accountId: string) => {
    setRefreshing(accountId)
    try {
      const response = await fetch(`/api/ad-accounts/${accountId}/refresh`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('토큰 갱신에 실패했습니다.')
      }

      router.refresh()
    } catch (error) {
      console.error('Refresh error:', error)
      alert('토큰 갱신에 실패했습니다.')
    } finally {
      setRefreshing(null)
    }
  }

  const getPlatformBadge = (platform: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      meta: { color: 'bg-blue-100 text-blue-800', label: 'Meta Ads' },
      kakao: { color: 'bg-yellow-100 text-yellow-800', label: 'Kakao Moment' },
      google: { color: 'bg-red-100 text-red-800', label: 'Google Ads' },
    }
    const badge = badges[platform] || { color: 'bg-gray-100 text-gray-800', label: platform }
    return (
      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center text-sm text-green-700">
          <CheckCircleIcon className="h-5 w-5 mr-1" />
          활성
        </span>
      )
    }
    return (
      <span className="inline-flex items-center text-sm text-red-700">
        <XCircleIcon className="h-5 w-5 mr-1" />
        비활성
      </span>
    )
  }

  const isTokenExpiringSoon = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry < 7 // 7일 이내 만료
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          연동된 광고 계정
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  플랫폼
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  계정명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  계정 ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연동일
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlatformBadge(account.platform)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.account_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(account.is_active)}
                    {isTokenExpiringSoon(account.token_expires_at) && (
                      <div className="mt-1">
                        <span className="inline-flex items-center text-xs text-orange-600">
                          ⚠️ 토큰 만료 임박
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(account.created_at)}
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRefresh(account.id)}
                        disabled={refreshing === account.id}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 inline-flex items-center"
                      >
                        <ArrowPathIcon
                          className={`h-4 w-4 mr-1 ${
                            refreshing === account.id ? 'animate-spin' : ''
                          }`}
                        />
                        {refreshing === account.id ? '갱신 중...' : '토큰 갱신'}
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
  )
}
