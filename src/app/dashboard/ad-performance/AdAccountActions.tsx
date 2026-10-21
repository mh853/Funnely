'use client'
// 광고 성과 화면 상단의 연결 계정 한 줄 요약과, 펼치면 보이는 플랫폼별(Meta·구글) 계정 목록·연결·동기화·연결 해제

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Platform = 'meta' | 'google'

interface AccountItem {
  id: string
  platform: Platform
  name: string
  accountId: string
  isActive: boolean
  needsReconnect: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
}

const PLATFORM_LABEL: Record<Platform, string> = { meta: 'Meta', google: '구글' }

export default function AdAccountActions({
  platforms,
  canManage,
  accounts,
  latestSyncedAt,
}: {
  platforms: Platform[]
  canManage: boolean
  accounts: AccountItem[]
  latestSyncedAt: string | null
}) {
  const router = useRouter()
  const reconnectCount = accounts.filter((a) => a.needsReconnect).length
  const errorCount = accounts.filter((a) => !a.needsReconnect && a.lastSyncError).length
  // 연결이 없거나 손볼 계정이 있으면 처음부터 펼쳐 둔다
  const [expanded, setExpanded] = useState(accounts.length === 0 || reconnectCount > 0 || errorCount > 0)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      let failed = 0
      // 연결된 계정이 있는 플랫폼만 차례로 동기화한다
      for (const platform of platforms.filter((p) => accounts.some((a) => a.platform === p))) {
        const res = await fetch('/api/ad-accounts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || '동기화에 실패했습니다.')
        failed += (data.results || []).filter((r: any) => r.status !== 'success').length
      }
      setMessage(
        failed > 0
          ? { type: 'error', text: `${failed}개 계정을 동기화하지 못했습니다. 계정 관리에서 상태를 확인해주세요.` }
          : { type: 'success', text: '최신 성과를 다시 불러왔습니다.' }
      )
      if (failed > 0) setExpanded(true)
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
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold text-gray-900">연결된 계정</span>
          <span className="text-gray-600">
            {platforms.map((p) => `${PLATFORM_LABEL[p]} ${accounts.filter((a) => a.platform === p).length}`).join(' · ')}
          </span>
          {latestSyncedAt && <span className="text-xs text-gray-500">마지막 동기화 {latestSyncedAt}</span>}
          {reconnectCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-xs text-amber-700">재연결 필요 {reconnectCount}</span>
          )}
          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-xs text-red-700">동기화 실패 {errorCount}</span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canManage && accounts.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {syncing ? '불러오는 중...' : '지금 동기화'}
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            계정 관리 {expanded ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mx-4 mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}
        >
          {message.text}
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {accounts.length === 0 ? (
            <p className="py-4 text-sm text-gray-500">
              {canManage
                ? '광고 계정을 연결하면 캠페인별 광고비·노출·클릭·전환을 확인할 수 있습니다'
                : '회사 관리자가 광고 계정을 연결할 수 있습니다'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {accounts.map((a) => (
                <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-3">
                    <span className="mt-0.5 w-10 shrink-0 text-xs font-medium text-gray-500">{PLATFORM_LABEL[a.platform]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {a.name}
                        {a.name !== a.accountId && <span className="ml-1 text-xs text-gray-400">({a.accountId})</span>}
                      </p>
                      <p className="text-xs mt-0.5">
                        {a.needsReconnect ? (
                          <span className="text-amber-600">재연결 필요 — {a.lastSyncError || '연결이 만료되었습니다'}</span>
                        ) : a.lastSyncError ? (
                          <span className="text-red-600">최근 동기화 실패 — {a.lastSyncError}</span>
                        ) : (
                          <span className="text-gray-500">
                            {a.lastSyncedAt ? `마지막 동기화 ${a.lastSyncedAt}` : '아직 동기화 전'}
                            {!a.isActive && ` · ${PLATFORM_LABEL[a.platform]}에서 비활성 상태인 계정(지난 성과만 조회)`}
                          </span>
                        )}
                      </p>
                    </div>
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

          {canManage && (
            <div className="pt-3 flex flex-wrap gap-2">
              {/* 서버 라우트가 state 쿠키를 심고 Meta 로그인·Google 동의 화면으로 바로 보낸다 */}
              {platforms.map((p) => {
                const platformAccounts = accounts.filter((a) => a.platform === p)
                const label =
                  platformAccounts.length === 0
                    ? `${PLATFORM_LABEL[p]} 계정 연결`
                    : platformAccounts.some((a) => a.needsReconnect)
                      ? `${PLATFORM_LABEL[p]} 다시 연결`
                      : `${PLATFORM_LABEL[p]} 계정 추가·다시 연결`
                return (
                  <a
                    key={p}
                    href={`/api/ad-accounts/connect/${p}`}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  >
                    + {label}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
