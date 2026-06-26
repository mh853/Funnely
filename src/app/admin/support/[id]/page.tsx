'use client'

import { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  Eye,
  X as XIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
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
    business_number: string
    phone: string
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
  is_internal_note: boolean
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
    email: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  open: '대기 중',
  in_progress: '처리 중',
  resolved: '해결됨',
  closed: '종료',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {title && (
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-700">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function AdminTicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState<Reply | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [editingReply, setEditingReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [savingReply, setSavingReply] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchTicketDetail()
  }, [params.id])

  async function getSignedUrl(filePathOrUrl: string): Promise<string> {
    let filePath = filePathOrUrl
    if (filePathOrUrl.includes('http')) {
      const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
      if (match) {
        filePath = match[1]
      } else {
        return ''
      }
    }
    const { data, error } = await supabase.storage
      .from('support-attachments')
      .createSignedUrl(filePath, 3600)
    if (error || !data) return ''
    return data.signedUrl
  }

  async function fetchTicketDetail() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch ticket')
      const result = await response.json()
      setTicket(result.ticket)
      setMessages(result.messages || [])
      await fetchReply()
    } catch (error) {
      console.error('Error fetching ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReply() {
    try {
      const response = await fetch(`/api/admin/support/tickets/${params.id}/reply`)
      if (!response.ok) return
      const result = await response.json()
      setReply(result.reply)
      if (result.reply) setReplyText(result.reply.reply_message)
    } catch (error) {
      console.error('Error fetching reply:', error)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim()) return
    try {
      setSending(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage, isInternalNote: true }),
      })
      if (!response.ok) throw new Error('Failed to send message')
      setNewMessage('')
      fetchTicketDetail()
    } catch {
      alert('메시지 전송에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!ticket) return
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      fetchTicketDetail()
    } catch {
      alert('상태 변경에 실패했습니다')
    } finally {
      setUpdating(false)
    }
  }

  async function handleUpdatePriority(newPriority: string) {
    if (!ticket) return
    try {
      setUpdating(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!response.ok) throw new Error('Failed to update priority')
      fetchTicketDetail()
    } catch {
      alert('우선순위 변경에 실패했습니다')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSaveReply() {
    if (!replyText.trim()) { alert('답변 내용을 입력해주세요'); return }
    try {
      setSavingReply(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}/reply`, {
        method: reply ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_message: replyText }),
      })
      if (!response.ok) throw new Error('Failed to save reply')
      await fetchReply()
      setEditingReply(false)
    } catch {
      alert('답변 저장에 실패했습니다')
    } finally {
      setSavingReply(false)
    }
  }

  async function handleDeleteReply() {
    if (!confirm('답변을 삭제하시겠습니까?')) return
    try {
      setSavingReply(true)
      const response = await fetch(`/api/admin/support/tickets/${params.id}/reply`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete reply')
      setReply(null)
      setReplyText('')
    } catch {
      alert('답변 삭제에 실패했습니다')
    } finally {
      setSavingReply(false)
    }
  }

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-100 border-t-indigo-600" />
      </div>
    )
  }

  const StatusIcon = STATUS_ICONS[ticket.status]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 pt-5 pb-10 shadow-lg shadow-indigo-100">
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-1.5 text-indigo-200 hover:text-white text-xs font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          목록으로 돌아가기
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">
              {CATEGORY_LABELS[ticket.category]}
            </p>
            <h1 className="text-xl font-bold text-white leading-snug">{ticket.subject}</h1>
            <p className="text-indigo-200 text-sm mt-1">
              {format(new Date(ticket.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
              <span className="mx-1.5 opacity-50">·</span>
              {ticket.created_by.full_name}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full flex-shrink-0 ${STATUS_BADGE[ticket.status]}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 -mt-5">
        {/* 메인 컨텐츠 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 문의 내용 */}
          <SectionCard title="문의 내용">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>
          </SectionCard>

          {/* 첨부 파일 */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <SectionCard title={`첨부 파일 (${ticket.attachments.length})`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ticket.attachments.map((filePathOrUrl, index) => {
                  let filePath = filePathOrUrl
                  if (filePathOrUrl.includes('http')) {
                    const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
                    if (match) filePath = match[1]
                  }
                  const fileName = filePath.split('/').pop() || `attachment-${index + 1}`
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

                  return (
                    <div key={index} className="flex items-center gap-2.5 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0">
                        {isImage ? (
                          <ImageIcon className="h-6 w-6 text-indigo-400" />
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
                              const url = await getSignedUrl(filePath)
                              if (url) setPreviewImage(url)
                            }}
                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <Eye className="h-2.5 w-2.5" />
                            미리보기
                          </button>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          const url = await getSignedUrl(filePath)
                          if (url) {
                            const a = document.createElement('a')
                            a.href = url
                            a.download = fileName.split('_').slice(1).join('_')
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }
                        }}
                        className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* 공식 답변 */}
          <SectionCard title="공식 답변">
            {!editingReply && reply ? (
              <div className="space-y-3">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-900">{reply.reply_by.full_name}</span>
                    <span className="text-xs text-indigo-500">
                      {format(new Date(reply.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                    </span>
                    {reply.updated_at !== reply.created_at && (
                      <span className="text-[10px] text-indigo-400">
                        (수정: {format(new Date(reply.updated_at), 'yyyy-MM-dd HH:mm', { locale: ko })})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {reply.reply_message}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setEditingReply(true)} variant="outline" size="sm" disabled={savingReply}>
                    답변 수정
                  </Button>
                  <Button onClick={handleDeleteReply} variant="outline" size="sm" disabled={savingReply} className="text-red-600 hover:text-red-700">
                    답변 삭제
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="공식 답변을 입력하세요..."
                  rows={8}
                  disabled={savingReply}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveReply}
                    disabled={savingReply || !replyText.trim()}
                    className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {savingReply ? '저장 중...' : reply ? '답변 수정' : '답변 작성'}
                  </button>
                  {editingReply && (
                    <Button onClick={() => { setEditingReply(false); setReplyText(reply?.reply_message || '') }} variant="outline" size="sm" disabled={savingReply}>
                      취소
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          {/* 내부 노트 목록 */}
          <SectionCard title="내부 노트">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">아직 내부 노트가 없습니다</div>
              ) : (
                messages.map((message) => {
                  const isAdmin = message.user.is_super_admin
                  const isInternal = message.is_internal_note
                  return (
                    <div key={message.id} className={`flex gap-2.5 ${isInternal ? 'bg-violet-50/60 p-3 rounded-lg border border-violet-100' : ''}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isInternal ? 'bg-violet-200' : isAdmin ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                        {isAdmin ? <Shield className="h-4 w-4 text-indigo-600" /> : <User className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-gray-900">{message.user.full_name}</span>
                          {isInternal && (
                            <span className="text-[10px] text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">내부</span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(message.created_at), 'MM/dd HH:mm', { locale: ko })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {message.message}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>

          {/* 내부 노트 입력 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <form onSubmit={handleSendMessage} className="space-y-3">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="내부 메모를 입력하세요... (고객에게 표시되지 않음)"
                rows={4}
                disabled={sending}
                className="text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? '전송 중...' : '내부 노트 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 고객 정보 */}
          <SectionCard title="고객 정보">
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Building2 className="h-3.5 w-3.5" /> 회사
                </div>
                <div className="text-sm font-semibold text-gray-900">{ticket.company.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{ticket.company.business_number}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <User className="h-3.5 w-3.5" /> 문의자
                </div>
                <div className="text-sm font-semibold text-gray-900">{ticket.created_by.full_name}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Mail className="h-3.5 w-3.5" /> 이메일
                </div>
                <div className="text-sm font-semibold text-gray-900 break-words">{ticket.created_by.email}</div>
              </div>
              {ticket.company.phone && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Phone className="h-3.5 w-3.5" /> 전화번호
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{ticket.company.phone}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 티켓 관리 */}
          <SectionCard title="티켓 관리">
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">상태</label>
                <Select value={ticket.status} onValueChange={handleUpdateStatus} disabled={updating}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-sm">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">우선순위</label>
                <Select value={ticket.priority} onValueChange={handleUpdatePriority} disabled={updating}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-sm">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">카테고리</div>
                  <div className="text-sm font-semibold text-gray-900">{CATEGORY_LABELS[ticket.category]}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">생성일</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {format(new Date(ticket.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">최근 수정</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {format(new Date(ticket.updated_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      <Transition appear show={!!previewImage} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setPreviewImage(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/75" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative max-w-5xl">
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                  >
                    <XIcon className="h-8 w-8" />
                  </button>
                  {previewImage && (
                    <img src={previewImage} alt="Preview" className="max-h-[80vh] max-w-full rounded-lg" />
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
