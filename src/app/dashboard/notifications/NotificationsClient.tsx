'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'
import Link from 'next/link'

interface Notification {
  id: string
  user_id: string | null
  company_id: string
  title: string
  message: string
  type: string
  metadata: Record<string, any>
  is_read: boolean
  created_at: string
}

interface NotificationsClientProps {
  initialNotifications: Notification[]
  userId: string
  companyId: string
}

export default function NotificationsClient({
  initialNotifications,
  userId,
  companyId,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  // 브로드캐스트(user_id NULL) 알림에 대한 내 읽음 영수증 - notification_id 집합
  const [readReceiptIds, setReadReceiptIds] = useState<Set<string>>(new Set())
  // new_lead 알림은 전화번호를 저장하지 않고 lead_id만 갖고 있어(68차 QA -
  // notifications에 평문 전화번호를 영구 저장하면 leads.phone 암호화가 무력화됨),
  // 화면에서 lead_id → 복호화된 전화번호로 그때그때 조회해 채운다.
  const [decryptedPhones, setDecryptedPhones] = useState<Record<string, string>>({})
  const supabase = createClient()

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

  // 특정 알림이 "나에게" 읽음 상태인지 계산 - 개인 알림은 is_read, 브로드캐스트는 읽음 영수증 존재 여부
  const isReadForMe = (notification: Notification) =>
    notification.user_id !== null ? notification.is_read : readReceiptIds.has(notification.id)

  // 내 읽음 영수증만 별도로 다시 조회
  async function fetchReadReceipts() {
    try {
      const { data, error } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)

      if (error) throw error

      setReadReceiptIds(new Set((data || []).map((r) => r.notification_id)))
    } catch (error) {
      console.error('❌ [Notifications] Failed to fetch read receipts:', error)
    }
  }

  // Fetch notifications from server (user-specific OR company-wide)
  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},and(user_id.is.null,company_id.eq.${companyId})`)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
      fetchReadReceipts()
    } catch (error) {
      console.error('❌ [Notifications] Failed to fetch notifications:', error)
    }
  }

  // 최초 마운트 시 읽음 영수증 로드 (초기 알림 목록은 서버에서 이미 내려받음)
  useEffect(() => {
    fetchReadReceipts()
  }, [userId])

  // Mark notification as read
  async function markAsRead(notification: Notification) {
    if (isReadForMe(notification)) return

    try {
      if (notification.user_id !== null) {
        // 개인 대상 알림 - Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )

        const { data: updated, error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id)
          .select('id')

        if (error) throw error
        if (!updated || updated.length === 0) throw new Error('읽음 처리 권한이 없습니다.')
      } else {
        // 브로드캐스트 알림 - 나만의 읽음 영수증을 추가 (다른 팀원에게는 영향 없음)
        setReadReceiptIds((prev) => new Set(prev).add(notification.id))

        // notification_reads RLS는 SELECT/INSERT/DELETE만 허용하고 UPDATE는
        // 허용하지 않는다 - 이미 존재하는 영수증은 갱신할 이유가 없으므로(최초
        // 읽음 시각만 의미 있음) ignoreDuplicates로 ON CONFLICT DO NOTHING을
        // 쓴다. onConflict만 주고 이 옵션을 안 주면 기본이 DO UPDATE라 RLS의
        // UPDATE 정책 부재로 두 번째 호출(중복 클릭, 다른 탭)에서 42501 에러가 난다.
        const { error } = await supabase
          .from('notification_reads')
          .upsert(
            { notification_id: notification.id, user_id: userId },
            { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
          )

        if (error) throw error
      }

      console.log('✅ [Notifications] Marked as read:', notification.id)
    } catch (error) {
      console.error('❌ [Notifications] Failed to mark as read:', error)
      // Revert optimistic update on error
      fetchNotifications()
    }
  }

  useEffect(() => {
    // Subscribe to Realtime notifications (both user-specific and company-wide)
    // Note: Realtime filters don't support complex OR conditions(user_id.eq.X OR
    // (user_id.is.null AND company_id.eq.Y)), so 사용자 단위 세분화는 핸들러에서
    // fetchNotifications()가 다시 RLS로 정확히 걸러온다. 다만 company_id 단일
    // 조건 필터는 Realtime이 지원하므로, RLS에만 의존하지 않도록 이것만이라도
    // 구독 단계에서 걸어 다른 회사 변경 이벤트 자체를 아예 받지 않게 한다
    // (68차 QA 확인 - 필터 없이 테이블 전체를 구독하고 있었음).
    const channel = supabase
      .channel('user-notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          // Service role로 INSERT된 경우 RLS로 인해 payload.new가 빈 객체일 수 있음
          // 그 경우 company_id 필터 없이 바로 fetchNotifications() 호출
          const record = (payload.new ?? payload.old) as Partial<Notification>
          const hasCompanyId = record && record.company_id

          if (!hasCompanyId || record.company_id === companyId) {
            console.log('🔔 [Notifications] Realtime notification change:', payload.eventType)
            fetchNotifications()
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Notifications] Successfully subscribed to notifications')
        }
      })

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [userId, companyId])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new_lead: '새 상담 신청',
      support_reply: '기술지원 답변',
      new_support_ticket: '새 기술지원 문의',
      new_public_inquiry: '홈페이지 문의',
      budget_warning: '예산 경고',
      budget_critical: '예산 긴급',
      performance_anomaly: '성과 이상',
      campaign_status: '캠페인 상태',
      sync_complete: '동기화 완료',
      subscription_changed: '구독 변경',
      subscription_started: '구독 시작',
      landing_page_timer_expired: '랜딩페이지 타이머 만료',
      subscription_expiring_soon: '구독 만료 예정',
      subscription_expired: '구독 만료',
    }
    return labels[type] || type
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      new_lead: 'bg-green-100 text-green-800',
      support_reply: 'bg-indigo-100 text-indigo-800',
      new_support_ticket: 'bg-blue-100 text-blue-800',
      new_public_inquiry: 'bg-teal-100 text-teal-800',
      budget_warning: 'bg-yellow-100 text-yellow-800',
      budget_critical: 'bg-red-100 text-red-800',
      performance_anomaly: 'bg-orange-100 text-orange-800',
      campaign_status: 'bg-blue-100 text-blue-800',
      sync_complete: 'bg-green-100 text-green-800',
      subscription_changed: 'bg-purple-100 text-purple-800',
      subscription_started: 'bg-green-100 text-green-800',
      landing_page_timer_expired: 'bg-orange-100 text-orange-800',
      subscription_expiring_soon: 'bg-yellow-100 text-yellow-800',
      subscription_expired: 'bg-red-100 text-red-800',
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  const renderNotificationLink = (notification: Notification) => {
    // New lead → link to leads dashboard
    if (notification.type === 'new_lead') {
      return (
        <Link
          href="/dashboard/leads"
          className="block hover:bg-gray-50"
          onClick={() => markAsRead(notification)}
        >
          {renderNotificationContent(notification)}
        </Link>
      )
    }

    // Support-related notifications link to the ticket
    if ((notification.type === 'support_reply' || notification.type === 'new_support_ticket') && notification.metadata?.ticket_id) {
      return (
        <Link
          href={`/dashboard/support/${notification.metadata.ticket_id}`}
          className="block hover:bg-gray-50"
          onClick={() => markAsRead(notification)}
        >
          {renderNotificationContent(notification)}
        </Link>
      )
    }

    // Landing page timer expired → link to landing pages
    if (notification.type === 'landing_page_timer_expired') {
      return (
        <Link
          href="/dashboard/landing-pages"
          className="block hover:bg-gray-50"
          onClick={() => markAsRead(notification)}
        >
          {renderNotificationContent(notification)}
        </Link>
      )
    }

    // Subscription notifications → link to subscription page
    if (notification.type === 'subscription_expiring_soon' || notification.type === 'subscription_expired') {
      return (
        <Link
          href="/dashboard/subscription"
          className="block hover:bg-gray-50"
          onClick={() => markAsRead(notification)}
        >
          {renderNotificationContent(notification)}
        </Link>
      )
    }

    // Other notification types can be handled here
    return (
      <div
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => markAsRead(notification)}
      >
        {renderNotificationContent(notification)}
      </div>
    )
  }

  const renderNotificationContent = (notification: Notification) => (
    <div
      className={`px-6 py-4 ${!isReadForMe(notification) ? 'bg-blue-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadge(
                notification.type
              )}`}
            >
              {getTypeLabel(notification.type)}
            </span>
            {!isReadForMe(notification) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                새 알림
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
          <p className="mt-1 text-sm text-gray-600">
            {notification.message}
            {notification.type === 'new_lead' && decryptedPhones[notification.metadata?.lead_id] && (
              <span className="ml-1 font-medium text-gray-800">
                ({decryptedPhones[notification.metadata.lead_id]})
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            {formatDateTime(notification.created_at)}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="px-4 space-y-4">
      {/* Header with Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
          <BellIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">알림</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            새 상담 신청, 기술지원 답변 등 계정에 대한 알림을 확인합니다.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">알림이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              새 상담 신청이 들어오거나 기술지원 답변이 등록되면 알림을 받게 됩니다.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div key={notification.id}>{renderNotificationLink(notification)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
