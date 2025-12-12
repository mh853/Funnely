'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  HeadphonesIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  TrendingUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
  company: {
    id: string
    name: string
    business_number: string
  }
  created_by: {
    id: string
    full_name: string
    email: string
  }
  assigned_admin: {
    id: string
    full_name: string
  } | null
  messages: { count: number }[]
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byCategory: Record<string, number>
  resolvedToday: number
  openTickets: number
}

const STATUS_LABELS: Record<string, string> = {
  open: '대기 중',
  in_progress: '처리 중',
  resolved: '해결됨',
  closed: '종료',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
}

const STATUS_ICONS: Record<string, any> = {
  open: Clock,
  in_progress: AlertCircle,
  resolved: CheckCircle,
  closed: XCircle,
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-600',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: '기술 문의',
  billing: '결제 문의',
  feature_request: '기능 요청',
  bug: '버그 신고',
  general: '일반 문의',
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [filter])

  async function fetchData() {
    try {
      setLoading(true)
      const [ticketsResponse, statsResponse] = await Promise.all([
        fetch(
          `/admin/api/support/tickets?${filter !== 'all' ? `status=${filter}` : ''}`
        ),
        fetch('/admin/api/support/stats'),
      ])

      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTickets(ticketsData.tickets || [])
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error fetching support data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">기술 지원 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          고객 문의를 관리하고 답변합니다
        </p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">전체 티켓</div>
                  <div className="text-2xl font-bold text-gray-900 mt-2">
                    {stats.total}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <HeadphonesIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">처리 대기</div>
                  <div className="text-2xl font-bold text-yellow-600 mt-2">
                    {stats.openTickets}
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">오늘 해결</div>
                  <div className="text-2xl font-bold text-green-600 mt-2">
                    {stats.resolvedToday}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">긴급 티켓</div>
                  <div className="text-2xl font-bold text-red-600 mt-2">
                    {stats.byPriority.urgent || 0}
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              전체
            </Button>
            <Button
              variant={filter === 'open' ? 'default' : 'outline'}
              onClick={() => setFilter('open')}
            >
              대기 중
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'default' : 'outline'}
              onClick={() => setFilter('in_progress')}
            >
              처리 중
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setFilter('resolved')}
            >
              해결됨
            </Button>
            <Button
              variant={filter === 'closed' ? 'default' : 'outline'}
              onClick={() => setFilter('closed')}
            >
              종료
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 티켓 목록 */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              로딩 중...
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              티켓이 없습니다
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const Icon = STATUS_ICONS[ticket.status]
            const statusColor = STATUS_COLORS[ticket.status]
            const priorityColor = PRIORITY_COLORS[ticket.priority]
            const messageCount = ticket.messages?.[0]?.count || 0

            return (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {ticket.subject}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {STATUS_LABELS[ticket.status]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {CATEGORY_LABELS[ticket.category]}
                          </span>
                          <span className={`text-xs font-medium ${priorityColor}`}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <div>{ticket.company.name}</div>
                          <div>{ticket.created_by.full_name}</div>
                          <div>
                            {format(
                              new Date(ticket.created_at),
                              'yyyy.MM.dd HH:mm',
                              { locale: ko }
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {messageCount}개 메시지
                          </div>
                          {ticket.assigned_admin && (
                            <div>담당자: {ticket.assigned_admin.full_name}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
