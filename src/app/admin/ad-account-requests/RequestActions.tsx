'use client'
// 네이버 광고계정 연결 요청 한 건의 승인·거절 버튼

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RequestActions({ id, canApprove }: { id: string; canApprove: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (action: 'approve' | 'reject') => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/admin/ad-account-requests/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(data.error || '처리하지 못했습니다.')
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => act('approve')}
          disabled={busy || !canApprove}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white disabled:opacity-40"
        >
          {busy ? '처리 중...' : '승인'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 disabled:opacity-40"
        >
          거절
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
