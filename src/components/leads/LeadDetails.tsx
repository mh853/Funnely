'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  GlobeAltIcon,
  UserIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import { formatDateTime, formatDate } from '@/lib/utils/date'

interface LeadDetailsProps {
  lead: any
  notes: any[]
  teamMembers: any[]
  currentUserId: string
}

const STATUS_OPTIONS = [
  { value: 'new', label: '신규' },
  { value: 'assigned', label: '배정됨' },
  { value: 'contacting', label: '연락중' },
  { value: 'consulting', label: '상담중' },
  { value: 'completed', label: '완료' },
  { value: 'on_hold', label: '보류' },
  { value: 'cancelled', label: '취소' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
  { value: 'urgent', label: '긴급' },
]

export default function LeadDetails({
  lead,
  notes,
  teamMembers,
  currentUserId,
}: LeadDetailsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [status, setStatus] = useState(lead.status)
  const [priority, setPriority] = useState(lead.priority)
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to || '')

  const handleUpdateStatus = async (newStatus: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: lead.id,
          status: newStatus,
          priority,
          assigned_to: assignedTo || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '업데이트 실패')
      }

      setStatus(newStatus)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          content: noteContent,
          status_changed_from: status !== lead.status ? lead.status : null,
          status_changed_to: status !== lead.status ? status : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '메모 추가 실패')
      }

      setNoteContent('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">연락처 정보</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                이름
              </dt>
              <dd className="mt-1 text-sm text-gray-900">{lead.name}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center">
                <PhoneIcon className="h-4 w-4 mr-2" />
                전화번호
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                <a href={`tel:${lead.phone}`} className="text-blue-600 hover:text-blue-800">
                  {lead.phone}
                </a>
              </dd>
            </div>

            {lead.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  이메일
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:text-blue-800">
                    {lead.email}
                  </a>
                </dd>
              </div>
            )}

            {lead.landing_pages && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  출처
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.landing_pages.title}</dd>
              </div>
            )}

            {lead.preferred_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  희망 날짜
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(lead.preferred_date)}
                </dd>
              </div>
            )}

            {lead.preferred_time && (
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  희망 시간
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{lead.preferred_time}</dd>
              </div>
            )}
          </dl>

          {lead.message && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <dt className="text-sm font-medium text-gray-500 mb-2">메시지</dt>
              <dd className="text-sm text-gray-900 whitespace-pre-wrap">{lead.message}</dd>
            </div>
          )}

          {lead.consultation_items && lead.consultation_items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <dt className="text-sm font-medium text-gray-500 mb-2">상담 희망 항목</dt>
              <dd className="flex flex-wrap gap-2">
                {lead.consultation_items.map((item: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </div>

        {/* UTM Information */}
        {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">유입 정보</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {lead.utm_source && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">UTM Source</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.utm_source}</dd>
                </div>
              )}
              {lead.utm_medium && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">UTM Medium</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.utm_medium}</dd>
                </div>
              )}
              {lead.utm_campaign && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">UTM Campaign</dt>
                  <dd className="mt-1 text-sm text-gray-900">{lead.utm_campaign}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">상담 메모</h2>

          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="mb-6">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="메모를 입력하세요..."
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading || !noteContent.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChatBubbleLeftIcon className="-ml-1 mr-2 h-5 w-5" />
                메모 추가
              </button>
            </div>
          </form>

          {/* Notes List */}
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">메모가 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note: any) => (
                <div key={note.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
                      {note.status_changed_from && note.status_changed_to && (
                        <p className="mt-1 text-xs text-gray-500">
                          상태 변경: {note.status_changed_from} → {note.status_changed_to}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <span>{note.users?.name || '알 수 없음'}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {formatDateTime(note.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Status Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">리드 관리</h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  handleUpdateStatus(e.target.value)
                }}
                disabled={loading}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={loading}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={loading}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                <option value="">미배정</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() =>
                handleUpdateStatus(status)
              }
              disabled={loading}
              className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '업데이트 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">타임라인</h2>
          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-gray-500">생성일</p>
              <p className="text-gray-900">
                {formatDateTime(lead.created_at)}
              </p>
            </div>

            {lead.first_contact_at && (
              <div className="text-sm">
                <p className="text-gray-500">첫 연락</p>
                <p className="text-gray-900">
                  {formatDateTime(lead.first_contact_at)}
                </p>
              </div>
            )}

            {lead.last_contact_at && (
              <div className="text-sm">
                <p className="text-gray-500">마지막 연락</p>
                <p className="text-gray-900">
                  {formatDateTime(lead.last_contact_at)}
                </p>
              </div>
            )}

            {lead.completed_at && (
              <div className="text-sm">
                <p className="text-gray-500">완료일</p>
                <p className="text-gray-900">
                  {formatDateTime(lead.completed_at)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
