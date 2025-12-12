'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Shield,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TicketDetail {
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
}

interface Message {
  id: string
  message: string
  created_at: string
  user: {
    id: string
    full_name: string
    is_super_admin: boolean
  }
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

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTicketDetail()
  }, [params.id])

  async function fetchTicketDetail() {
    try {
      setLoading(true)
      const response = await fetch(`/api/support/tickets/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch ticket')

      const result = await response.json()
      setTicket(result.ticket)
      setMessages(result.messages || [])
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()

    if (!newMessage.trim()) return

    try {
      setSending(true)
      const response = await fetch(`/api/support/tickets/${params.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      setNewMessage('')
      fetchTicketDetail()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('메시지 전송에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const Icon = STATUS_ICONS[ticket.status]
  const statusColor = STATUS_COLORS[ticket.status]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
        <Link href="/support">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{ticket.subject}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(ticket.created_at), 'yyyy년 MM월 dd일 HH:mm', {
                locale: ko,
              })}{' '}
              • {ticket.created_by.full_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${statusColor}`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
      </div>

      {/* 티켓 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>문의 내용</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">카테고리</div>
                <div className="font-medium text-gray-900 mt-1">
                  {CATEGORY_LABELS[ticket.category]}
                </div>
              </div>
              <div>
                <div className="text-gray-500">우선순위</div>
                <div className="font-medium text-gray-900 mt-1">
                  {PRIORITY_LABELS[ticket.priority]}
                </div>
              </div>
              <div>
                <div className="text-gray-500">담당자</div>
                <div className="font-medium text-gray-900 mt-1">
                  {ticket.assigned_admin
                    ? ticket.assigned_admin.full_name
                    : '미할당'}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-gray-900 whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 대화 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>대화 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                아직 답변이 없습니다
              </div>
            ) : (
              messages.map((message) => {
                const isAdmin = message.user.is_super_admin

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isAdmin ? 'bg-blue-100' : 'bg-gray-100'
                      }`}
                    >
                      {isAdmin ? (
                        <Shield className="h-5 w-5 text-blue-600" />
                      ) : (
                        <User className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className={`flex-1 ${isAdmin ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {message.user.full_name}
                          {isAdmin && (
                            <span className="ml-2 text-xs text-blue-600">
                              기술 지원팀
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(
                            new Date(message.created_at),
                            'MM/dd HH:mm',
                            { locale: ko }
                          )}
                        </span>
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isAdmin
                            ? 'bg-blue-100 text-gray-900'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.message}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 메시지 입력 */}
      {ticket.status !== 'closed' && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSendMessage} className="space-y-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="답변을 입력하세요..."
                rows={4}
                disabled={sending}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? '전송 중...' : '메시지 전송'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
