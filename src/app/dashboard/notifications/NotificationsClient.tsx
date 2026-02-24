'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BellIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'
import Link from 'next/link'

interface Notification {
  id: string
  user_id: string
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
  const supabase = createClient()

  // Fetch notifications from server (company_id 기반)
  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('❌ [Notifications] Failed to fetch notifications:', error)
    }
  }

  // Mark notification as read
  async function markAsRead(notificationId: string) {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      console.log('✅ [Notifications] Marked as read:', notificationId)
    } catch (error) {
      console.error('❌ [Notifications] Failed to mark as read:', error)
      // Revert optimistic update on error
      fetchNotifications()
    }
  }

  useEffect(() => {
    // Subscribe to Realtime notifications (both user-specific and company-wide)
    // Note: Realtime filters don't support complex OR conditions,
    // so we subscribe to the whole table and filter in the handler
    const channel = supabase
      .channel('user-notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
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
          onClick={() => markAsRead(notification.id)}
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
          onClick={() => markAsRead(notification.id)}
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
          onClick={() => markAsRead(notification.id)}
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
          onClick={() => markAsRead(notification.id)}
        >
          {renderNotificationContent(notification)}
        </Link>
      )
    }

    // Other notification types can be handled here
    return (
      <div
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => markAsRead(notification.id)}
      >
        {renderNotificationContent(notification)}
      </div>
    )
  }

  const renderNotificationContent = (notification: Notification) => (
    <div
      className={`px-6 py-4 ${!notification.is_read ? 'bg-blue-50' : ''}`}
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
            {!notification.is_read && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                새 알림
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
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
            기술지원 답변, 예산, 성과, 캠페인 상태에 대한 알림을 확인합니다.
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
              기술지원 답변, 예산 소진율이 높거나 성과에 이상이 발생하면 알림을 받게 됩니다.
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
