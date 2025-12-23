'use client'

import { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
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
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Eye,
  X as XIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TicketDetail {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
  attachments: string[] | null
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

interface Reply {
  id: string
  reply_message: string
  created_at: string
  updated_at: string
  reply_by: {
    id: string
    full_name: string
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
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchTicketDetail()
  }, [params.id])

  // Generate signed URL for private storage file
  async function getSignedUrl(filePathOrUrl: string): Promise<string> {
    console.log('getSignedUrl called with:', filePathOrUrl)

    // Extract file path from URL if it's a full URL
    let filePath = filePathOrUrl
    if (filePathOrUrl.includes('http')) {
      // Extract path from URL: .../support-attachments/PATH
      const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
      if (match) {
        filePath = match[1]
        console.log('Extracted file path from URL:', filePath)
      } else {
        console.error('Could not extract file path from URL:', filePathOrUrl)
        return ''
      }
    }

    const { data, error } = await supabase.storage
      .from('support-attachments')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      console.error('Supabase error creating signed URL:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return ''
    }

    if (!data) {
      console.error('No data returned from createSignedUrl')
      return ''
    }

    console.log('Successfully created signed URL:', data.signedUrl)
    return data.signedUrl
  }

  async function fetchTicketDetail() {
    try {
      setLoading(true)
      const response = await fetch(`/api/support/tickets/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch ticket')

      const result = await response.json()
      console.log('Ticket data received:', result.ticket)
      console.log('Attachments:', result.ticket.attachments)
      setTicket(result.ticket)
      setMessages(result.messages || [])

      // 답변 조회
      await fetchReply()
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReply() {
    try {
      const response = await fetch(`/api/support/tickets/${params.id}/reply`)
      if (!response.ok) throw new Error('Failed to fetch reply')

      const result = await response.json()
      setReply(result.reply)
    } catch (error) {
      console.error('Error fetching reply:', error)
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
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* 헤더 */}
        <div>
        <Link href="/dashboard/support">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            목록으로 돌아가기
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 mb-1.5">{ticket.subject}</h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{format(new Date(ticket.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
              <span className="text-gray-300">•</span>
              <span>{ticket.created_by.full_name}</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColor} flex-shrink-0`}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
      </div>

      {/* 티켓 정보 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">문의 내용</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="text-xs text-gray-500 mb-1">카테고리</div>
                <div className="text-sm font-medium text-gray-900">
                  {CATEGORY_LABELS[ticket.category]}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">우선순위</div>
                <div className="text-sm font-medium text-gray-900">
                  {PRIORITY_LABELS[ticket.priority]}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">담당자</div>
                <div className="text-sm font-medium text-gray-900">
                  {ticket.assigned_admin ? ticket.assigned_admin.full_name : '미할당'}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 첨부 파일 */}
      {ticket.attachments && ticket.attachments.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Paperclip className="h-4 w-4" />
              첨부 파일 ({ticket.attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ticket.attachments.map((filePathOrUrl, index) => {
                // Extract file path from URL if needed
                let filePath = filePathOrUrl
                if (filePathOrUrl.includes('http')) {
                  const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
                  if (match) {
                    filePath = match[1]
                  }
                }

                const fileName = filePath.split('/').pop() || `attachment-${index + 1}`
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {isImage ? (
                        <ImageIcon className="h-6 w-6 text-blue-500" />
                      ) : (
                        <FileText className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {decodeURIComponent(fileName.split('_').slice(1).join('_'))}
                      </p>
                      {isImage && (
                        <button
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const signedUrl = await getSignedUrl(filePath)
                            if (signedUrl) {
                              setPreviewImage(signedUrl)
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <Eye className="h-2.5 w-2.5" />
                          미리보기
                        </button>
                      )}
                    </div>
                    <button
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const signedUrl = await getSignedUrl(filePath)
                        if (signedUrl) {
                          const link = document.createElement('a')
                          link.href = signedUrl
                          link.download = fileName.split('_').slice(1).join('_')
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }
                      }}
                      className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="다운로드"
                    >
                      <Download className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 공식 답변 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">답변</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {reply ? (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">기술 지원팀</span>
                <span className="text-xs text-blue-600/70">
                  {format(new Date(reply.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                </span>
              </div>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {reply.reply_message}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12 text-sm">
              답변 대기 중입니다
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* 이미지 미리보기 모달 */}
      <Transition appear show={!!previewImage} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setPreviewImage(null)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/75" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative max-w-5xl">
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                  >
                    <XIcon className="h-8 w-8" />
                  </button>
                  {previewImage && (
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-h-[80vh] max-w-full rounded-lg"
                    />
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
