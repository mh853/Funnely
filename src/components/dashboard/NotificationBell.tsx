'use client'

import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/date'

interface Notification {
  id: string
  user_id: string | null
  company_id: string
  title: string
  message: string
  type: string
  metadata: Record<string, any>
  campaign_id?: string | null
  is_read: boolean
  created_at: string
}

interface ToastNotification {
  id: string
  title: string
  message: string
  type: string
}

export default function NotificationBell({ companyId, userId }: { companyId: string; userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  // 브로드캐스트(user_id NULL) 알림에 대한 내 읽음 영수증 - notification_id 집합
  const [readReceiptIds, setReadReceiptIds] = useState<Set<string>>(new Set())
  // 뱃지용 미읽음 개수 - 화면에 표시되는 최근 10개가 아니라 회사 전체를 대상으로 별도 계산
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const isInitialLoad = useRef(true)
  // new_lead 알림은 전화번호를 저장하지 않고 lead_id만 갖고 있어(68차 QA -
  // notifications에 평문 전화번호를 영구 저장하면 leads.phone 암호화가 무력화됨),
  // 화면에서 lead_id → 복호화된 전화번호로 그때그때 조회해 채운다.
  const [decryptedPhones, setDecryptedPhones] = useState<Record<string, string>>({})

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showToast = (notification: Notification) => {
    setToasts((prev) => [...prev, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
    }])
    setTimeout(() => dismissToast(notification.id), 6000)
  }

  // 특정 알림이 "나에게" 읽음 상태인지 계산 - 개인 알림은 is_read, 브로드캐스트는 읽음 영수증 존재 여부
  const isReadForMe = (notification: Notification) =>
    notification.user_id !== null ? notification.is_read : readReceiptIds.has(notification.id)

  useEffect(() => {
    const leadIds = Array.from(
      new Set(
        notifications
          .filter((n) => n.type === 'new_lead' && n.metadata?.lead_id && !decryptedPhones[n.metadata.lead_id])
          .map((n) => n.metadata.lead_id as string)
      )
    )
    if (leadIds.length === 0) return

    fetch('/api/leads/decrypt-phones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result?.phones) {
          setDecryptedPhones((prev) => ({ ...prev, ...result.phones }))
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  useEffect(() => {
    // Realtime이 SUBSCRIBED로 확인되기 전까지는 30초 폴백 폴링을 유지하고,
    // 확인되면 멈춘다. 이후 연결이 끊기면(CHANNEL_ERROR/TIMED_OUT/CLOSED)
    // 다시 폴링을 재개한다 — 알림 유실을 막는 게 쿼리 수를 줄이는 것보다 우선.
    // isActive는 cleanup에서 가장 먼저 false로 바꿔야 한다: removeChannel()이
    // 내부적으로 동기적으로 CLOSED 상태를 발생시킬 수 있는데, 이때 정리된 이후에
    // 다시 setInterval이 걸려 타이머가 새는 것을 막기 위함이다.
    let isActive = true
    let pollIntervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (!isActive || pollIntervalId) return
      pollIntervalId = setInterval(() => {
        fetchNotifications()
        fetchUnreadCount()
      }, 30000)
    }
    const stopPolling = () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId)
        pollIntervalId = null
      }
    }

    fetchNotifications()
    fetchUnreadCount()

    const supabase = createClient()

    // 연결 확인 전 공백이 없도록 폴백을 먼저 시작해둔다
    startPolling()

    const channel = supabase
      .channel(`notifications-bell-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          fetchNotifications()
          fetchUnreadCount()
          // 다른 사용자 대상 알림(user_id 지정)은 RLS 때문에 payload.new가 빈
          // 객체로 올 수 있다(company_id 필터는 통과하지만 행 자체는 안 보임) -
          // 이 경우 제목/본문이 undefined인 빈 토스트가 뜨는 걸 막는다.
          const newRecord = payload.new as Partial<Notification>
          if (!isInitialLoad.current && newRecord?.id && newRecord?.title) {
            showToast(newRecord as Notification)
          }
        }
      )
      .on(
        // INSERT만 구독하면 다른 탭/기기에서 읽음 처리해도(is_read UPDATE) 이 탭의
        // 뱃지/목록이 새 알림이 오기 전까지 갱신되지 않는다 - UPDATE도 함께 구독.
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchNotifications()
          fetchUnreadCount()
        }
      )
      .on(
        // 브로드캐스트(user_id NULL) 알림의 읽음 여부는 notification_reads에 별도로
        // 기록되므로, 그쪽 테이블 변경도 감시해야 다른 탭에서 읽은 브로드캐스트 알림이
        // 이 탭에도 반영된다.
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_reads',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications()
          fetchUnreadCount()
        }
      )
      .subscribe((status) => {
        if (!isActive) return
        if (status === 'SUBSCRIBED') {
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPolling()
        }
      })

    return () => {
      isActive = false
      supabase.removeChannel(channel)
      stopPolling()
    }
  }, [userId, companyId])

  const fetchNotifications = async () => {
    try {
      const supabase = createClient()
      // notifications 테이블은 company_id 기반으로 동작
      const [{ data }, { data: reads }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId),
      ])

      if (data) {
        setNotifications(data)
        isInitialLoad.current = false
      }
      setReadReceiptIds(new Set((reads || []).map((r) => r.notification_id)))
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // 뱃지/모두읽음에 쓸 실제 미읽음 개수 - 화면에 표시되는 최근 10개가 아니라
  // 개인 대상 알림은 카운트 쿼리로, 브로드캐스트 알림은 전체 id와 내 읽음 영수증을
  // 가져와 차집합으로 계산한다 (회사당 브로드캐스트 알림 수는 많지 않아 허용 가능한 방식).
  const fetchUnreadCount = async () => {
    try {
      const supabase = createClient()

      const [{ count: targetedUnread }, { data: broadcastNotifs }, { data: myReads }] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('user_id', userId)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('id')
          .eq('company_id', companyId)
          .is('user_id', null),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId),
      ])

      const readIds = new Set((myReads || []).map((r) => r.notification_id))
      const broadcastUnread = (broadcastNotifs || []).filter((n) => !readIds.has(n.id)).length

      setUnreadCount((targetedUnread || 0) + broadcastUnread)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const markAsRead = async (notification: Notification) => {
    if (isReadForMe(notification)) return

    try {
      const supabase = createClient()

      if (notification.user_id !== null) {
        // 개인 대상 알림
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id)

        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
      } else {
        // 브로드캐스트 알림 - 나만의 읽음 영수증을 추가 (다른 팀원에게는 영향 없음)
        // notification_reads RLS는 UPDATE 정책이 없으므로 ignoreDuplicates로
        // ON CONFLICT DO NOTHING을 써야 한다(기본값인 DO UPDATE는 이미 존재하는
        // 영수증에 대해 RLS 위반 42501을 유발함 - 중복 클릭/여러 탭에서 재현됨).
        await supabase
          .from('notification_reads')
          .upsert(
            { notification_id: notification.id, user_id: userId },
            { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
          )

        setReadReceiptIds((prev) => new Set(prev).add(notification.id))
      }

      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()

      // 화면에 로드된 10개가 아니라 회사 전체의 미읽음 알림을 대상으로 처리
      const [{ data: targetedUnread }, { data: broadcastNotifs }, { data: myReads }] = await Promise.all([
        supabase
          .from('notifications')
          .select('id')
          .eq('company_id', companyId)
          .eq('user_id', userId)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('id')
          .eq('company_id', companyId)
          .is('user_id', null),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId),
      ])

      const readIds = new Set((myReads || []).map((r) => r.notification_id))
      const targetedIds = (targetedUnread || []).map((n) => n.id)
      const broadcastUnreadIds = (broadcastNotifs || [])
        .map((n) => n.id)
        .filter((id) => !readIds.has(id))

      if (targetedIds.length === 0 && broadcastUnreadIds.length === 0) return

      await Promise.all([
        targetedIds.length > 0
          ? supabase.from('notifications').update({ is_read: true }).in('id', targetedIds)
          : Promise.resolve(null),
        broadcastUnreadIds.length > 0
          ? supabase.from('notification_reads').upsert(
              broadcastUnreadIds.map((notification_id) => ({ notification_id, user_id: userId })),
              { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
            )
          : Promise.resolve(null),
      ])

      setNotifications((prev) =>
        prev.map((n) => (n.user_id !== null ? { ...n, is_read: true } : n))
      )
      setReadReceiptIds((prev) => {
        const next = new Set(prev)
        broadcastUnreadIds.forEach((id) => next.add(id))
        return next
      })
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      new_lead: 'text-green-600',
      support_reply: 'text-indigo-600',
      new_support_ticket: 'text-blue-600',
      budget_warning: 'text-yellow-600',
      budget_critical: 'text-red-600',
      performance_anomaly: 'text-orange-600',
      campaign_status: 'text-blue-600',
      sync_complete: 'text-green-600',
      subscription_changed: 'text-purple-600',
      subscription_started: 'text-green-600',
      landing_page_timer_expired: 'text-orange-600',
      subscription_expiring_soon: 'text-yellow-600',
      subscription_expired: 'text-red-600',
    }
    return colors[type] || 'text-gray-600'
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      new_lead: '📋',
      support_reply: '💬',
      new_support_ticket: '📩',
      budget_warning: '⚠️',
      budget_critical: '🚨',
      performance_anomaly: '📊',
      campaign_status: 'ℹ️',
      sync_complete: '✅',
      subscription_changed: '🔄',
      subscription_started: '🎉',
      landing_page_timer_expired: '⏰',
      subscription_expiring_soon: '⏳',
      subscription_expired: '🔒',
    }
    return icons[type] || '📢'
  }

  return (
    <>
      {/* Toast Notifications (fixed, top-right) */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-10 overflow-hidden animate-slide-in-right"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-xl">{getTypeIcon(toast.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{toast.message}</p>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* 자동 소멸 프로그레스 바 */}
            <div className="h-0.5 bg-blue-500 animate-shrink-width" />
          </div>
        ))}
      </div>

    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-500"
        title={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : undefined}
        aria-label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : '알림'}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel - 데스크탑은 종 아이콘 기준 absolute right-0(w-96)로 기존과
              동일하게 두되, 모바일에서는 종 아이콘이 화면 오른쪽 끝(프로필
              메뉴 등 뒤에 더 있는 요소들)에 붙어있지 않아 그 지점 기준으로
              384px를 왼쪽으로 펼치면 화면 왼쪽 밖으로 잘려 나갔다 - 뷰포트
              기준 좌우 여백(inset-x-4)으로 고정폭 없이 펼치도록 전환 */}
          <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                알림 ({unreadCount} 읽지 않음)
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  모두 읽음 표시
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  로딩 중...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">새로운 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !isReadForMe(notification) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification)
                      // Handle different notification types
                      if (notification.type === 'new_lead') {
                        window.location.href = `/dashboard/leads`
                      } else if ((notification.type === 'support_reply' || notification.type === 'new_support_ticket') && notification.metadata?.ticket_id) {
                        window.location.href = `/dashboard/support/${notification.metadata.ticket_id}`
                      } else if (notification.type === 'landing_page_timer_expired') {
                        window.location.href = `/dashboard/landing-pages`
                      } else if (notification.type === 'subscription_expiring_soon' || notification.type === 'subscription_expired') {
                        window.location.href = `/dashboard/subscription`
                      } else if (notification.campaign_id) {
                        window.location.href = `/dashboard/campaigns/${notification.campaign_id}`
                      }
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-3 text-xl">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {notification.message}
                          {notification.type === 'new_lead' && decryptedPhones[notification.metadata?.lead_id] && (
                            <span className="ml-1 font-medium text-gray-700">
                              ({decryptedPhones[notification.metadata.lead_id]})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>
                      {!isReadForMe(notification) && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="h-2 w-2 bg-blue-600 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200">
                <a
                  href="/dashboard/notifications"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  모든 알림 보기 →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  )
}
