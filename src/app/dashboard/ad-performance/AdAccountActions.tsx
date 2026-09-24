'use client'
// 광고 성과 화면의 Meta 계정 연결·지금 동기화·연결 해제 버튼과 계정 상태 목록

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountItem {
  id: string
  name: string
  accountId: string
  isActive: boolean
  needsReconnect: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
}

export default function AdAccountActions({ canManage, accounts }: { canManage: boolean; accounts: AccountItem[] }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const anyNeedsReconnect = accounts.some((a) => a.needsReconnect)

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/ad-accounts/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || '동기화에 실패했습니다.')
      const failed = (data.results || []).filter((r: any) => r.status !== 'success').length
      setMessage(
        failed > 0
          ? { type: 'error', text: `${failed}개 계정을 동기화하지 못했습니다. 계정 상태를 확인해주세요.` }
          : { type: 'success', text: '최근 30일 성과를 다시 불러왔습니다.' }
      )
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    setMessage(null)
    const res = await fetch(`/api/ad-accounts/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setConfirmingId(null)
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '연결 해제에 실패했습니다.' })
      return
    }
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Meta 광고 계정</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {accounts.length === 0
              ? '광고 계정을 연결하면 캠페인별 광고비·노출·클릭·전환을 확인할 수 있습니다'
              : `${accounts.length}개 계정 연결됨`}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {syncing ? '불러오는 중...' : '지금 동기화'}
              </button>
            )}
            {/* 서버 라우트가 state 쿠키를 심고 Meta 로그인으로 바로 보낸다 */}
            <a
              href="/api/ad-accounts/connect/meta"
              className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              {accounts.length === 0 ? 'Meta 광고 계정 연결' : anyNeedsReconnect ? '다시 연결' : '계정 추가·다시 연결'}
            </a>
          </div>
        ) : (
          accounts.length === 0 && <p className="text-xs text-gray-500">회사 관리자가 광고 계정을 연결할 수 있습니다</p>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {accounts.map((a) => (
            <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {a.name} <span className="text-xs text-gray-400">({a.accountId})</span>
                </p>
                <p className="text-xs mt-0.5">
                  {a.needsReconnect ? (
                    <span className="text-amber-600">재연결 필요 — {a.lastSyncError || '연결이 만료되었습니다'}</span>
                  ) : a.lastSyncError ? (
                    <span className="text-red-600">최근 동기화 실패 — {a.lastSyncError}</span>
                  ) : (
                    <span className="text-gray-500">
                      {a.lastSyncedAt ? `마지막 동기화 ${a.lastSyncedAt}` : '아직 동기화 전'}
                      {!a.isActive && ' · Meta에서 비활성 상태인 계정(지난 성과만 조회)'}
                    </span>
                  )}
                </p>
              </div>
              {canManage &&
                (confirmingId === a.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600">연결을 해제하면 이 계정의 성과 데이터도 삭제됩니다</span>
                    <button onClick={() => handleDisconnect(a.id)} className="px-2 py-1 rounded bg-red-600 text-white">
                      해제
                    </button>
                    <button onClick={() => setConfirmingId(null)} className="px-2 py-1 rounded border border-gray-300">
                      취소
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingId(a.id)} className="text-xs text-gray-500 hover:text-red-600">
                    연결 해제
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
