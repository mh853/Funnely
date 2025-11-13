'use client'

import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface SyncCampaignButtonProps {
  adAccountId: string
  campaignId?: string
}

export default function SyncCampaignButton({
  adAccountId,
  campaignId,
}: SyncCampaignButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/sync/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adAccountId,
          campaignId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '동기화에 실패했습니다.')
      }

      setMessage(data.message || '동기화가 완료되었습니다.')

      // Refresh the page after 1 second
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      setMessage(err.message || '동기화에 실패했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        title="플랫폼에서 최신 데이터 동기화"
      >
        <ArrowPathIcon
          className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`}
        />
        {syncing ? '동기화 중...' : '동기화'}
      </button>
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  )
}
