'use client'
// 광고 성과 화면 상단의 연결 계정 한 줄 요약과, 펼치면 보이는 플랫폼별(Meta·구글·네이버·카카오) 계정 목록·연결·동기화·연결 해제

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ConnectGuide from './ConnectGuide'

type Platform = 'meta' | 'google' | 'naver' | 'kakao'

interface AccountItem {
  id: string
  platform: Platform
  name: string
  accountId: string
  isActive: boolean
  needsReconnect: boolean
  lastSyncedAt: string | null
  lastSyncError: string | null
  /** Meta 호출 한도에 걸린 상태 (Access Tier 승인 전 임시 안내) */
  rateLimited?: boolean
  /** 연결이 7일 안에 끝나면 남은 일수 (Meta만 해당) */
  expiresInDays?: number | null
  approval: 'pending' | 'approved' | 'rejected' | null
  /** 네이버 요청을 퍼널리가 직접 확인한 뒤 연결하는 경우 */
  manualReview?: boolean
}

const PLATFORM_LABEL: Record<Platform, string> = { meta: 'Meta', google: '구글', naver: '네이버', kakao: '카카오' }

// 네이버 연결 요청이 승인 전·거절이면 '연결된 계정'으로 세지 않는다
const isConnected = (a: AccountItem) => a.approval !== 'pending' && a.approval !== 'rejected'

export default function AdAccountActions({
  platforms,
  canManage,
  accounts,
  latestSyncedAt,
  naverInviteId,
  metaAutoRenew,
}: {
  platforms: Platform[]
  canManage: boolean
  accounts: AccountItem[]
  latestSyncedAt: string | null
  naverInviteId: string
  /** Meta 연결 자동 연장 설정 - 아직 묻지 않았으면 null */
  metaAutoRenew: boolean | null
}) {
  const router = useRouter()
  const connected = accounts.filter(isConnected)
  const reconnectCount = connected.filter((a) => a.needsReconnect).length
  const errorCount = connected.filter((a) => !a.needsReconnect && a.lastSyncError).length
  const expiringCount = connected.filter((a) => !a.needsReconnect && a.expiresInDays != null).length
  const hasMeta = connected.some((a) => a.platform === 'meta')
  const askMetaAutoRenew = canManage && hasMeta && metaAutoRenew === null
  // 연결이 없거나 손볼 계정·곧 끝나는 연결·승인 대기 요청이 있으면 처음부터 펼쳐 둔다
  const [expanded, setExpanded] = useState(
    connected.length === 0 ||
      reconnectCount > 0 ||
      errorCount > 0 ||
      expiringCount > 0 ||
      askMetaAutoRenew ||
      accounts.some((a) => a.approval === 'pending')
  )
  const [syncing, setSyncing] = useState(false)
  // router.refresh()로 새 성과가 화면에 그려지는 동안 true
  const [refreshing, startRefresh] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  // 연결 버튼을 누르면 바로 이동하지 않고 그 플랫폼의 초보자용 안내를 먼저 펼친다
  const [guideFor, setGuideFor] = useState<Platform | null>(null)
  const [naverCustomerId, setNaverCustomerId] = useState('')
  const [naverSubmitting, setNaverSubmitting] = useState(false)
  const [autoRenewSaving, setAutoRenewSaving] = useState(false)

  const handleMetaAutoRenew = async (enabled: boolean) => {
    setAutoRenewSaving(true)
    setMessage(null)
    const res = await fetch('/api/ad-accounts/meta/auto-renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    const data = await res.json().catch(() => ({}))
    setAutoRenewSaving(false)
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '설정을 저장하지 못했습니다.' })
      return
    }
    setMessage({
      type: 'success',
      text: enabled
        ? 'Meta 연결 자동 연장을 켰습니다. 끝나기 30일 전부터, 페이스북에 로그인된 브라우저로 퍼널리를 열면 알아서 연장됩니다.'
        : 'Meta 연결 자동 연장을 껐습니다. 끝나기 7일 전에 화면과 메일로 다시 연결을 안내해 드립니다.',
    })
    router.refresh()
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)
    try {
      let failed = 0
      // 연결된 계정이 있는 플랫폼만 차례로 동기화한다
      const targets = platforms.filter((p) => connected.some((a) => a.platform === p))
      for (const platform of targets) {
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
          : {
              type: 'success',
              // 카카오 보고서는 어제까지만 받을 수 있어, 오늘 성과를 기대하고 누른 경우를 위해 덧붙인다
              text: targets.includes('kakao')
                ? '최신 성과를 다시 불러왔습니다. 카카오는 성과를 하루 뒤에 넘겨줘서 오늘 성과는 내일부터 보입니다.'
                : '최신 성과를 다시 불러왔습니다.',
            }
      )
      if (failed > 0) setExpanded(true)
      // 결과 문구는 표·마지막 동기화 시각이 새 값으로 바뀐 뒤에 보인다 (아래 !refreshing)
      startRefresh(() => router.refresh())
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleNaverRequest = async () => {
    setNaverSubmitting(true)
    setMessage(null)
    const res = await fetch('/api/ad-accounts/connect/naver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: naverCustomerId }),
    })
    const data = await res.json().catch(() => ({}))
    setNaverSubmitting(false)
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || '연결 요청에 실패했습니다.' })
      return
    }
    setGuideFor(null)
    setNaverCustomerId('')
    setMessage(
      data.review
        ? { type: 'success', text: '연결 요청을 받았습니다. 퍼널리가 광고계정을 확인한 뒤 연결해 드립니다.' }
        : { type: 'success', text: '연결 요청을 받았습니다. 퍼널리가 네이버 초대를 수락하면 자동으로 연결됩니다.' }
    )
    router.refresh()
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
            {platforms.map((p) => `${PLATFORM_LABEL[p]} ${connected.filter((a) => a.platform === p).length}`).join(' · ')}
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
          {canManage && connected.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing || refreshing}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {syncing || refreshing ? '불러오는 중...' : '지금 동기화'}
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

      {message && !refreshing && (
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
                ? '광고 계정을 연결하면 캠페인별 광고비·노출·클릭·전환을 확인할 수 있습니다. 아래에서 연결할 광고 버튼을 누르면 방법을 차례로 안내해 드립니다.'
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
                        {a.approval === 'pending' && a.manualReview ? (
                          <span className="text-blue-600">연결 대기 — 퍼널리가 광고계정을 확인한 뒤 연결해 드립니다</span>
                        ) : a.approval === 'pending' ? (
                          <span className="text-blue-600">연결 대기 — 퍼널리가 네이버 초대를 수락하면 자동으로 연결됩니다</span>
                        ) : a.approval === 'rejected' ? (
                          <span className="text-red-600">연결이 승인되지 않았습니다 — 퍼널리 고객센터로 문의해주세요</span>
                        ) : a.needsReconnect ? (
                          <span className="text-amber-600">재연결 필요 — {a.lastSyncError || '연결이 만료되었습니다'}</span>
                        ) : a.expiresInDays != null ? (
                          <span className="text-amber-600">
                            {a.expiresInDays}일 뒤 연결이 끝납니다 — 아래 &apos;{PLATFORM_LABEL[a.platform]} 계정 추가·다시 연결&apos;로 미리 다시
                            연결해 주세요
                          </span>
                        ) : a.rateLimited && a.lastSyncError ? (
                          <span className="text-amber-600">잠시 대기 — {a.lastSyncError}</span>
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

          {canManage && hasMeta && (
            <div className={`mt-3 rounded-lg p-3 text-sm ${askMetaAutoRenew ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
              {askMetaAutoRenew ? (
                <>
                  <p className="font-medium text-gray-900">앞으로 Meta 연결을 자동으로 연장할까요?</p>
                  <p className="mt-1 text-gray-600">
                    Meta 연결은 약 60일마다 끝납니다. 켜 두면 끝나기 30일 전부터, 이 연결을 만든 분이 페이스북에 로그인된 브라우저로
                    퍼널리를 열 때 화면 뒤에서 알아서 연장합니다. 연장이 안 되면(사파리, 페이스북 로그아웃 등) 지금처럼 7일 전에 안내해
                    드립니다.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleMetaAutoRenew(true)}
                      disabled={autoRenewSaving}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white disabled:opacity-50"
                    >
                      자동으로 연장하기
                    </button>
                    <button
                      onClick={() => handleMetaAutoRenew(false)}
                      disabled={autoRenewSaving}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 disabled:opacity-50"
                    >
                      직접 다시 연결할게요
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 text-gray-600">
                  <span>
                    Meta 연결 자동 연장 {metaAutoRenew ? '켜짐 — 페이스북에 로그인된 브라우저로 퍼널리를 열면 끝나기 전에 연장됩니다' : '꺼짐'}
                  </span>
                  <button
                    onClick={() => handleMetaAutoRenew(!metaAutoRenew)}
                    disabled={autoRenewSaving}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {metaAutoRenew ? '끄기' : '켜기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {canManage && (
            <div className="pt-3 flex flex-wrap gap-2">
              {platforms.map((p) => {
                const platformAccounts = accounts.filter((a) => a.platform === p)
                const label =
                  platformAccounts.length === 0
                    ? `${PLATFORM_LABEL[p]} 계정 연결`
                    : p !== 'naver' && platformAccounts.some((a) => a.needsReconnect)
                      ? `${PLATFORM_LABEL[p]} 다시 연결`
                      : p === 'naver'
                        ? '네이버 계정 추가'
                        : `${PLATFORM_LABEL[p]} 계정 추가·다시 연결`
                return (
                  <button
                    key={p}
                    onClick={() => setGuideFor((v) => (v === p ? null : p))}
                    aria-expanded={guideFor === p}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      guideFor === p ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    + {label}
                  </button>
                )
              })}
            </div>
          )}

          {canManage && guideFor && (
            <ConnectGuide
              platform={guideFor}
              naverInviteId={naverInviteId}
              naverForm={
                <div className="flex flex-wrap gap-2">
                  <input
                    value={naverCustomerId}
                    onChange={(e) => setNaverCustomerId(e.target.value)}
                    inputMode="numeric"
                    placeholder="광고계정 ID(숫자)"
                    aria-label="네이버 광고계정 ID"
                    className="px-3 py-2 rounded-lg border border-gray-300 w-48"
                  />
                  <button
                    onClick={handleNaverRequest}
                    disabled={naverSubmitting || !naverCustomerId.trim()}
                    className="px-3 py-2 rounded-lg font-medium bg-blue-600 text-white disabled:opacity-50"
                  >
                    {naverSubmitting ? '요청 중...' : '연결 요청'}
                  </button>
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  )
}
