'use client'

import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils/date'

interface Notification {
  id: string
  user_id: string
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
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const isInitialLoad = useRef(true)

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

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()

    const subscribeToNotifications = () => {
      return supabase
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
            // 초기 로드 이후에만 토스트 표시
            if (!isInitialLoad.current) {
              showToast(payload.new as Notification)
            }
          }
        )
        .subscribe()
    }

    const channel = subscribeToNotifications()

    // Realtime이 누락할 경우를 대비한 폴링 백업 (30초)
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [userId, companyId])

  const fetchNotifications = async () => {
    try {
      const supabase = createClient()
      // notifications 테이블은 company_id 기반으로 동작
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data)
        isInitialLoad.current = false
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = createClient()
      // Notification may be user-specific (user_id set) or company-wide (user_id null)
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = createClient()
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
      if (unreadIds.length === 0) return

      // Update by IDs to cover both user-specific (user_id set) and company-wide (user_id null)
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

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

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20">
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
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id)
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
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
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
