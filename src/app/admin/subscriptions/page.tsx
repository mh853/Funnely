'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Subscription {
  id: string
  status: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancelled_at: string | null
  company: {
    id: string
    name: string
    email: string
  }
  plan: {
    id: string
    name: string
    price_monthly: number
    price_yearly: number
    max_users: number | null
    max_leads: number | null
  }
  created_at: string
}

interface SubscriptionsData {
  subscriptions: Subscription[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const STATUS_LABELS: Record<string, string> = {
  active: '활성',
  trial: '체험',
  expired: '만료',
  cancelled: '취소',
  suspended: '정지',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  suspended: 'bg-yellow-100 text-yellow-700',
}

const STATUS_ICONS: Record<string, any> = {
  active: CheckCircle,
  trial: Clock,
  expired: XCircle,
  cancelled: XCircle,
  suspended: AlertCircle,
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<SubscriptionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchSubscriptions()
  }, [filter, page])

  async function fetchSubscriptions() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/admin/api/subscriptions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch subscriptions')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(subscriptionId: string, newStatus: string) {
    if (!confirm(`구독 상태를 "${STATUS_LABELS[newStatus]}"로 변경하시겠습니까?`))
      return

    try {
      const response = await fetch(`/admin/api/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update subscription')

      fetchSubscriptions()
      alert('구독 상태가 변경되었습니다')
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('구독 상태 변경에 실패했습니다')
    }
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
          <h2 className="text-2xl font-bold text-gray-900">구독 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            회사별 구독 상태 및 플랜을 관리합니다
          </p>
        </div>
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
              variant={filter === 'active' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('active')
                setPage(1)
              }}
            >
              활성
            </Button>
            <Button
              variant={filter === 'trial' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('trial')
                setPage(1)
              }}
            >
              체험
            </Button>
            <Button
              variant={filter === 'expired' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('expired')
                setPage(1)
              }}
            >
              만료
            </Button>
            <Button
              variant={filter === 'cancelled' ? 'default' : 'outline'}
              onClick={() => {
                setFilter('cancelled')
                setPage(1)
              }}
            >
              취소
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 구독 목록 */}
      <div className="grid grid-cols-1 gap-4">
        {data.subscriptions.map((subscription) => {
          const Icon = STATUS_ICONS[subscription.status] || CreditCard
          const statusColor = STATUS_COLORS[subscription.status]

          return (
            <Card key={subscription.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {subscription.company.name}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {STATUS_LABELS[subscription.status]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">플랜</div>
                          <div className="font-medium text-gray-900">
                            {subscription.plan.name}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">결제 주기</div>
                          <div className="font-medium text-gray-900">
                            {subscription.billing_cycle === 'monthly'
                              ? '월간'
                              : '연간'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">요금</div>
                          <div className="font-medium text-gray-900">
                            {subscription.billing_cycle === 'monthly'
                              ? `₩${subscription.plan.price_monthly.toLocaleString()}/월`
                              : `₩${subscription.plan.price_yearly.toLocaleString()}/년`}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">기간</div>
                          <div className="font-medium text-gray-900">
                            {format(
                              new Date(subscription.current_period_start),
                              'yyyy.MM.dd',
                              { locale: ko }
                            )}{' '}
                            ~{' '}
                            {format(
                              new Date(subscription.current_period_end),
                              'yyyy.MM.dd',
                              { locale: ko }
                            )}
                          </div>
                        </div>
                      </div>

                      {subscription.trial_end && (
                        <div className="mt-2 text-sm text-blue-600">
                          체험 기간 종료:{' '}
                          {format(
                            new Date(subscription.trial_end),
                            'yyyy.MM.dd HH:mm',
                            { locale: ko }
                          )}
                        </div>
                      )}

                      {subscription.cancelled_at && (
                        <div className="mt-2 text-sm text-red-600">
                          취소일:{' '}
                          {format(
                            new Date(subscription.cancelled_at),
                            'yyyy.MM.dd HH:mm',
                            { locale: ko }
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {subscription.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(subscription.id, 'suspended')
                          }
                        >
                          정지
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(subscription.id, 'cancelled')
                          }
                        >
                          취소
                        </Button>
                      </>
                    )}
                    {subscription.status === 'suspended' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(subscription.id, 'active')
                        }
                      >
                        활성화
                      </Button>
                    )}
                    {subscription.status === 'trial' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(subscription.id, 'active')
                        }
                      >
                        정식 전환
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {data.subscriptions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {filter === 'all'
              ? '등록된 구독이 없습니다'
              : `${STATUS_LABELS[filter]} 상태의 구독이 없습니다`}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            전체 {data.pagination.total.toLocaleString()}개 중{' '}
            {((page - 1) * 20 + 1).toLocaleString()}-
            {Math.min(page * 20, data.pagination.total).toLocaleString()}개 표시
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
    </div>
  )
}
