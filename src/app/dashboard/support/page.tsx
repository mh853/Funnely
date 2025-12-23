'use client'

import { useEffect, useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Headphones,
  Upload,
  X as XIcon,
  File,
  Image as ImageIcon,
  Paperclip,
  Eye,
} from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  attachments: string[] | null
}

interface AttachedFile {
  file: File
  preview?: string
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

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'text/csv',
]

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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchTickets()
  }, [filter, currentPage])

  // Generate signed URL for private storage file
  async function getSignedUrl(filePathOrUrl: string): Promise<string> {
    // Extract file path from URL if it's a full URL
    let filePath = filePathOrUrl
    if (filePathOrUrl.includes('http')) {
      const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
      if (match) {
        filePath = match[1]
      } else {
        console.error('Could not extract file path from URL:', filePathOrUrl)
        return ''
      }
    }

    const { data, error } = await supabase.storage
      .from('support-attachments')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error || !data) {
      console.error('Failed to create signed URL:', error)
      return ''
    }

    return data.signedUrl
  }

  async function fetchTickets() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: perPage.toString(),
      })

      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/api/support/tickets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tickets')

      const result = await response.json()
      setTickets(result.tickets || [])
      setTotalPages(result.pagination?.totalPages || 0)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newAttachedFiles: AttachedFile[] = []

    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`파일 "${file.name}"이(가) 너무 큽니다. 최대 10MB까지 업로드 가능합니다.`)
        continue
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError(`파일 "${file.name}"은(는) 지원하지 않는 형식입니다.`)
        continue
      }

      // Create preview for images
      const attachedFile: AttachedFile = { file }
      if (file.type.startsWith('image/')) {
        attachedFile.preview = URL.createObjectURL(file)
      }
      newAttachedFiles.push(attachedFile)
    }

    setAttachedFiles((prev) => [...prev, ...newAttachedFiles])
    e.target.value = '' // Reset input
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => {
      const newFiles = [...prev]
      // Revoke preview URL if exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  async function uploadFiles(ticketId: string): Promise<string[]> {
    const uploadedUrls: string[] = []

    for (const { file } of attachedFiles) {
      // Sanitize filename: remove special chars, replace spaces with underscores
      const sanitizedName = file.name
        .replace(/[^\w\s.-]/g, '') // Remove special characters except word chars, spaces, dots, hyphens
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore

      const fileExt = sanitizedName.split('.').pop()
      const timestamp = Date.now()
      const filePath = `${ticketId}/${timestamp}_${sanitizedName}`

      const { data, error } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, file)

      if (error) {
        console.error('File upload error:', error)
        throw new Error(`파일 업로드 실패: ${file.name}`)
      }

      // Store file path (not URL) for later signed URL generation
      uploadedUrls.push(filePath)
    }

    return uploadedUrls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploading(true)

    try {
      // Create ticket first
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create ticket')

      const { ticket } = await response.json()

      // Upload files if any
      let attachmentUrls: string[] = []
      if (attachedFiles.length > 0) {
        attachmentUrls = await uploadFiles(ticket.id)

        // Update ticket with attachments
        await fetch(`/api/support/tickets/${ticket.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attachments: attachmentUrls,
          }),
        })
      }

      // Reset form
      setIsDialogOpen(false)
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'technical',
      })
      setAttachedFiles([])
      fetchTickets()
      alert('문의가 접수되었습니다')
    } catch (error: any) {
      console.error('Error creating ticket:', error)
      setError(error.message || '문의 접수에 실패했습니다')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      subject: '',
      description: '',
      priority: 'medium',
      category: 'technical',
    })
    setAttachedFiles([])
    setError(null)
    setIsDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">기술 지원</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                기술적인 문의사항을 접수하고 답변을 확인하세요
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
          >
            <Plus className="h-4 w-4" />
            새 문의 작성
          </button>
        </div>

        {/* 모달 */}
        <Transition appear show={isDialogOpen} as={Fragment}>
          <Dialog as="div" className="relative z-[60]" onClose={handleClose}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/50" />
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
                  <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Headphones className="h-5 w-5" />
                          <Dialog.Title as="h3" className="text-lg font-bold">
                            새 문의 작성
                          </Dialog.Title>
                        </div>
                        <button
                          onClick={handleClose}
                          className="p-2 hover:bg-white/20 rounded-full transition"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="text-sm text-indigo-100 mt-1">
                        기술 지원팀에 문의사항을 전달해주세요
                      </p>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                      {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                          {error}
                        </div>
                      )}

                      {/* 제목 */}
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                          제목 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="subject"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value })
                          }
                          placeholder="문의 제목을 입력하세요"
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      {/* 카테고리 & 우선순위 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                            카테고리 <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="category"
                            value={formData.category}
                            onChange={(e) =>
                              setFormData({ ...formData, category: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                            우선순위 <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="priority"
                            value={formData.priority}
                            onChange={(e) =>
                              setFormData({ ...formData, priority: e.target.value })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 내용 */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                          내용 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="문의 내용을 자세히 설명해주세요"
                          rows={6}
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>

                      {/* 파일 첨부 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          파일 첨부 <span className="text-xs text-gray-500">(선택사항, 최대 10MB)</span>
                        </label>
                        <div className="space-y-3">
                          {/* 파일 업로드 버튼 */}
                          <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition group">
                            <Upload className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 mr-2" />
                            <span className="text-sm text-gray-600 group-hover:text-indigo-600">
                              스크린샷 또는 파일 선택
                            </span>
                            <input
                              type="file"
                              multiple
                              accept={ALLOWED_FILE_TYPES.join(',')}
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>

                          {/* 첨부된 파일 목록 */}
                          {attachedFiles.length > 0 && (
                            <div className="space-y-2">
                              {attachedFiles.map((attachedFile, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  {attachedFile.preview ? (
                                    <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden">
                                      <img
                                        src={attachedFile.preview}
                                        alt={attachedFile.file.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                      <File className="h-6 w-6 text-gray-500" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {attachedFile.file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(attachedFile.file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition"
                                  >
                                    <XIcon className="h-4 w-4 text-gray-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            지원 형식: 이미지 (JPG, PNG, GIF, WebP), PDF, TXT, JSON, CSV
                          </p>
                        </div>
                      </div>

                      {/* 버튼 */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={uploading}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploading ? '접수 중...' : '문의 접수'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* 필터 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('all')
                  setCurrentPage(1)
                }}
              >
                전체
              </Button>
              <Button
                variant={filter === 'open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('open')
                  setCurrentPage(1)
                }}
              >
                대기 중
              </Button>
              <Button
                variant={filter === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('in_progress')
                  setCurrentPage(1)
                }}
              >
                처리 중
              </Button>
              <Button
                variant={filter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilter('resolved')
                  setCurrentPage(1)
                }}
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
                <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
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

                          {/* 첨부파일 미리보기 */}
                          {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mb-3 flex items-center gap-2 flex-wrap">
                              {ticket.attachments.slice(0, 3).map((filePathOrUrl, idx) => {
                                // Extract file path from URL if needed
                                let filePath = filePathOrUrl
                                if (filePathOrUrl.includes('http')) {
                                  const match = filePathOrUrl.match(/support-attachments\/(.+)$/)
                                  if (match) {
                                    filePath = match[1]
                                  }
                                }

                                const fileName = filePath.split('/').pop() || `attachment-${idx + 1}`
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

                                return (
                                  <div
                                    key={idx}
                                    onClick={async (e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      const signedUrl = await getSignedUrl(filePath)
                                      if (!signedUrl) return

                                      if (isImage) {
                                        setPreviewImage(signedUrl)
                                      } else {
                                        window.open(signedUrl, '_blank')
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded text-xs text-gray-700 cursor-pointer transition-colors"
                                  >
                                    {isImage ? (
                                      <ImageIcon className="h-3 w-3 text-blue-500" />
                                    ) : (
                                      <File className="h-3 w-3 text-gray-500" />
                                    )}
                                    <span className="truncate max-w-[100px]">
                                      {decodeURIComponent(fileName.split('_').slice(1).join('_'))}
                                    </span>
                                    {isImage && <Eye className="h-3 w-3 text-gray-400" />}
                                  </div>
                                )
                              })}
                              {ticket.attachments.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{ticket.attachments.length - 3}개 더
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {messageCount}개 답변
                            </div>
                            {ticket.attachments && ticket.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                {ticket.attachments.length}개 파일
                              </div>
                            )}
                            <div>
                              {format(
                                new Date(ticket.created_at),
                                'yyyy.MM.dd HH:mm',
                                { locale: ko }
                              )}
                            </div>
                            <div className={PRIORITY_COLORS[ticket.priority]}>
                              우선순위: {PRIORITY_LABELS[ticket.priority]}
                            </div>
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

        {/* 페이지네이션 */}
        {!loading && totalPages > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-6"
          />
        )}
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
