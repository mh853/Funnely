'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertCircle,
  TrendingUp,
  FileText,
  User,
  CreditCard,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  read_at: string | null
  sent_at: string
}

interface NotificationsData {
  notifications: Notification[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  unreadCount: number
}

const TYPE_ICONS: Record<string, any> = {
  new_lead: AlertCircle,
  status_change: TrendingUp,
  goal_achieved: TrendingUp,
  report_ready: FileText,
  user_activity: User,
  subscription_started: CreditCard,
  subscription_changed: CreditCard,
  subscription_expiring_soon: Clock,
  subscription_expired: AlertTriangle,
  subscription_in_grace_period: Clock,
}

const TYPE_COLORS: Record<string, string> = {
  new_lead: 'text-blue-600 bg-blue-50',
  status_change: 'text-purple-600 bg-purple-50',
  goal_achieved: 'text-green-600 bg-green-50',
  report_ready: 'text-orange-600 bg-orange-50',
  user_activity: 'text-gray-600 bg-gray-50',
  subscription_started: 'text-indigo-600 bg-indigo-50',
  subscription_changed: 'text-indigo-600 bg-indigo-50',
  subscription_expiring_soon: 'text-orange-600 bg-orange-50',
  subscription_expired: 'text-red-600 bg-red-50',
  subscription_in_grace_period: 'text-yellow-600 bg-yellow-50',
}

const TYPE_LABELS: Record<string, string> = {
  new_lead: '신규 리드',
  status_change: '상태 변경',
  goal_achieved: '목표 달성',
  report_ready: '리포트 완료',
  user_activity: '사용자 활동',
  subscription_started: '구독 시작',
  subscription_changed: '구독 변경',
  subscription_expiring_soon: '구독 만료 예정',
  subscription_expired: '구독 만료',
  subscription_in_grace_period: '결제 지연',
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()

    // Supabase Realtime 구독
    const supabase = createClient()

    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // 알림 변경 시 즉시 목록 새로고침
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [page, filter])

  async function fetchNotifications() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (filter === 'unread') {
        params.set('unread_only', 'true')
      }

      const response = await fetch(`/api/admin/notifications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(notificationIds: string[]) {
    // 1. 낙관적 업데이트 (즉시 UI 반영)
    setData((prevData) => {
      if (!prevData) return prevData

      return {
        ...prevData,
        notifications: prevData.notifications.map((n) =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, prevData.unreadCount - notificationIds.length),
      }
    })

    // 2. API 호출 (백그라운드)
    try {
      const response = await fetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      })

      if (!response.ok) throw new Error('Failed to mark as read')

      // 3. 성공 시 Realtime이 NotificationBell 자동 업데이트
      // fetchNotifications() 호출 불필요 (이미 로컬 업데이트됨)
    } catch (error) {
      console.error('Error marking as read:', error)

      // 4. 실패 시 롤백 (서버 데이터로 복구)
      fetchNotifications()
    }
  }

  async function handleMarkAllAsRead() {
    if (!data?.notifications) return

    const unreadIds = data.notifications
      .filter((n) => !n.read)
      .map((n) => n.id)

    if (unreadIds.length === 0) return

    // handleMarkAsRead가 낙관적 업데이트를 자동으로 수행
    await handleMarkAsRead(unreadIds)
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">데이터를 불러올 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">알림 센터</h2>
          <p className="text-sm text-gray-500 mt-1">
            시스템 알림을 확인하고 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={data.unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            모두 읽음 처리
          </Button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전체 알림</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {data.pagination.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">읽지 않음</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {data.unreadCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">읽음</div>
            <div className="text-2xl font-bold text-gray-600 mt-2">
              {(data.pagination.total - data.unreadCount).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('all')
                setPage(1)
              }}
            >
              전체
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('unread')
                setPage(1)
              }}
            >
              읽지 않음 ({data.unreadCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 알림 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>
            알림 목록 ({data.pagination.total.toLocaleString()}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] || Bell
              const colorClass = TYPE_COLORS[notification.type] || 'text-gray-600 bg-gray-50'

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    notification.read
                      ? 'bg-white border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          새로운 알림
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(notification.sent_at), 'PPp', { locale: ko })}
                      </div>
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {TYPE_LABELS[notification.type] || notification.type}
                      </span>
                    </div>
                  </div>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead([notification.id])}
                    >
                      읽음 처리
                    </Button>
                  )}
                </div>
              )
            })}

            {data.notifications.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                전체 {data.pagination.total.toLocaleString()}개 중{' '}
                {((page - 1) * 20 + 1).toLocaleString()}-
                {Math.min(page * 20, data.pagination.total).toLocaleString()}개
                표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
