'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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
  messages: { count: number }[]
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

const CATEGORY_LABELS: Record<string, string> = {
  technical: '기술 문의',
  billing: '결제 문의',
  feature_request: '기능 요청',
  bug: '버그 신고',
  general: '일반 문의',
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'technical',
  })

  useEffect(() => {
    fetchTickets()
  }, [filter])

  async function fetchTickets() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/api/support/tickets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tickets')

      const result = await response.json()
      setTickets(result.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create ticket')

      setIsDialogOpen(false)
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'technical',
      })
      fetchTickets()
      alert('문의가 접수되었습니다')
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('문의 접수에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">기술 지원</h2>
            <p className="text-sm text-gray-500 mt-1">
              기술적인 문의사항을 접수하고 답변을 확인하세요
            </p>
          </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 문의 작성
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>새 문의 작성</DialogTitle>
              <DialogDescription>
                기술 지원팀에 문의사항을 전달해주세요
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  제목 *
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="문의 제목을 입력하세요"
                  required
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    카테고리 *
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-900">
                    우선순위 *
                  </label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-900">
                  내용 *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="문의 내용을 자세히 설명해주세요"
                  rows={8}
                  required
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit">문의 접수</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
          </div>
        </CardContent>
      </Card>

      {/* 티켓 목록 */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              문의 내역이 없습니다
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const Icon = STATUS_ICONS[ticket.status]
            const statusColor = STATUS_COLORS[ticket.status]
            const messageCount = ticket.messages?.[0]?.count || 0

            return (
              <Link key={ticket.id} href={`/support/${ticket.id}`}>
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
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {messageCount}개 답변
                          </div>
                          <div>
                            {format(
                              new Date(ticket.created_at),
                              'yyyy.MM.dd HH:mm',
                              { locale: ko }
                            )}
                          </div>
                          <div>우선순위: {PRIORITY_LABELS[ticket.priority]}</div>
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
    </div>
  )
}
