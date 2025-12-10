'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import EventModal from './EventModal'
import { createClient } from '@/lib/supabase/client'
import { decryptPhone } from '@/lib/encryption/phone'
import { formatDateTime, formatDate, formatTime } from '@/lib/utils/date'

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  created_at: string
  preferred_date?: string
  preferred_time?: string
  landing_page_id?: string
  contract_completed_at?: string
  previous_contract_completed_at?: string
}

interface CalendarViewProps {
  events: any[]
  leads: Lead[]
  teamMembers: any[]
  currentUserId: string
  statusFilter?: string
}

type ViewMode = 'month' | 'week' | 'day'

const EVENT_COLORS = {
  call: 'bg-blue-100 border-blue-500 text-blue-900',
  meeting: 'bg-purple-100 border-purple-500 text-purple-900',
  consultation: 'bg-green-100 border-green-500 text-green-900',
  task: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  other: 'bg-gray-100 border-gray-500 text-gray-900',
}

const LEAD_STATUS_COLORS = {
  new: 'bg-orange-100 border-orange-500 text-orange-900',
  contacted: 'bg-sky-100 border-sky-500 text-sky-900',
  qualified: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  converted: 'bg-teal-100 border-teal-500 text-teal-900',
  contract_completed: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  lost: 'bg-red-100 border-red-500 text-red-900',
}

const STATUS_LABELS: { [key: string]: string } = {
  new: '신규',
  contacted: '연락완료',
  qualified: '상담예정',
  converted: '전환완료',
  contract_completed: '예약확정',
  lost: '이탈',
}

// 상태별 스타일 정의 (모달 테이블용)
const STATUS_STYLES: { [key: string]: { bg: string; text: string; label: string } } = {
  new: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '상담 거절' },
  contacted: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  qualified: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  converted: { bg: 'bg-green-100', text: 'text-green-800', label: '상담 완료' },
  contract_completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '예약 확정' },
  needs_followup: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '추가상담 필요' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800', label: '기타' },
}

// 상태 변경 가능 목록
const STATUS_OPTIONS = [
  { value: 'new', label: '상담 전' },
  { value: 'rejected', label: '상담 거절' },
  { value: 'contacted', label: '상담 진행중' },
  { value: 'converted', label: '상담 완료' },
  { value: 'contract_completed', label: '예약 확정' },
  { value: 'needs_followup', label: '추가상담 필요' },
  { value: 'other', label: '기타' },
]

export default function CalendarView({
  events,
  leads,
  teamMembers,
  currentUserId,
  statusFilter,
}: CalendarViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDayDetailModal, setShowDayDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<{ events: any[], leads: Lead[], day: number } | null>(null)

  // Lead detail modal state
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadDetails, setLeadDetails] = useState<any>(null)
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)
  const [statusLogs, setStatusLogs] = useState<any[]>([])
  const [loadingStatusLogs, setLoadingStatusLogs] = useState(false)

  // 콜/상담 담당자 수정 상태
  const [updatingCallAssignee, setUpdatingCallAssignee] = useState(false)
  const [updatingCounselor, setUpdatingCounselor] = useState(false)


  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const targetDate = new Date(year, month, day)
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getFullYear() === targetDate.getFullYear() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getDate() === targetDate.getDate()
      )
    })
  }

  // Get leads for a specific day (by contract_completed_at for contract_completed status, otherwise preferred_date or created_at)
  const getLeadsForDay = (day: number) => {
    const targetDate = new Date(year, month, day)
    return leads.filter((lead) => {
      // For contract_completed status, use contract_completed_at date
      if (lead.status === 'contract_completed' && lead.contract_completed_at) {
        const completedDate = new Date(lead.contract_completed_at)
        return (
          completedDate.getFullYear() === targetDate.getFullYear() &&
          completedDate.getMonth() === targetDate.getMonth() &&
          completedDate.getDate() === targetDate.getDate()
        )
      }
      // Check preferred_date first (if set)
      if (lead.preferred_date) {
        const preferredDate = new Date(lead.preferred_date)
        if (
          preferredDate.getFullYear() === targetDate.getFullYear() &&
          preferredDate.getMonth() === targetDate.getMonth() &&
          preferredDate.getDate() === targetDate.getDate()
        ) {
          return true
        }
      }
      // Otherwise check created_at
      const createdDate = new Date(lead.created_at)
      return (
        createdDate.getFullYear() === targetDate.getFullYear() &&
        createdDate.getMonth() === targetDate.getMonth() &&
        createdDate.getDate() === targetDate.getDate()
      )
    })
  }

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  // Handle day click - open day detail modal to show all items
  const handleDayClick = (day: number) => {
    const dayEvents = getEventsForDay(day)
    const dayLeads = getLeadsForDay(day)
    setSelectedDayData({ events: dayEvents, leads: dayLeads, day })
    setShowDayDetailModal(true)
  }

  // Handle add event from day detail modal
  const handleAddEventFromDay = (day: number) => {
    const clickedDate = new Date(year, month, day)
    setSelectedDate(clickedDate)
    setSelectedEvent(null)
    setShowDayDetailModal(false)
    setShowEventModal(true)
  }

  // Handle event click
  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setSelectedDate(null)
    setShowEventModal(true)
  }

  // Handle lead click - open lead detail modal
  const handleLeadClick = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
    setLoadingLeadDetails(true)
    setLoadingStatusLogs(true)
    setStatusLogs([])

    try {
      const supabase = createClient()

      // 리드 상세 정보와 상태 변경 로그를 병렬로 가져옴
      const [leadResult, logsResult] = await Promise.all([
        supabase
          .from('leads')
          .select(`
            *,
            landing_pages (
              id,
              title,
              slug
            ),
            call_assigned_user:users!leads_call_assigned_to_fkey(id, full_name, email),
            counselor_assigned_user:users!leads_counselor_assigned_to_fkey(id, full_name, email)
          `)
          .eq('id', lead.id)
          .single(),
        supabase
          .from('lead_status_logs')
          .select(`
            id,
            previous_status,
            new_status,
            created_at,
            changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
          `)
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
      ])

      if (leadResult.error) throw leadResult.error
      setLeadDetails(leadResult.data)

      if (!logsResult.error && logsResult.data) {
        setStatusLogs(logsResult.data)
      }
    } catch (error) {
      console.error('Error fetching lead details:', error)
    } finally {
      setLoadingLeadDetails(false)
      setLoadingStatusLogs(false)
    }
  }

  // Handle status update (using API to properly track previous_contract_completed_at)
  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedLead || !leadDetails) return

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          status: newStatus,
          // 계약완료로 변경 시 현재 시간 기록
          ...(newStatus === 'contract_completed' && {
            contract_completed_at: new Date().toISOString()
          })
        })
      })

      if (!response.ok) throw new Error('상태 업데이트 실패')

      const result = await response.json()

      // Update local state (계약완료↔다른 상태 전환 시 날짜 이동)
      let updatedData: any = { status: newStatus }

      // 계약완료로 변경 시: 기존 날짜 → previous로 이동, 새 날짜 설정
      if (newStatus === 'contract_completed') {
        updatedData.previous_contract_completed_at = leadDetails.contract_completed_at || null
        updatedData.contract_completed_at = new Date().toISOString()
      }
      // 계약완료에서 다른 상태로 변경 시: 날짜 → previous로 이동, 빈칸으로
      else if (leadDetails.status === 'contract_completed') {
        updatedData.previous_contract_completed_at = leadDetails.contract_completed_at || null
        updatedData.contract_completed_at = null
      }

      setLeadDetails({ ...leadDetails, ...updatedData })
      setLocalLeads(localLeads.map(l =>
        l.id === selectedLead.id ? { ...l, ...updatedData } : l
      ))
      setEditingStatus(false)

      // 상태 변경 로그 새로고침
      try {
        const supabase = createClient()
        const { data: newLogs } = await supabase
          .from('lead_status_logs')
          .select(`
            id,
            previous_status,
            new_status,
            created_at,
            changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
          `)
          .eq('lead_id', selectedLead.id)
          .order('created_at', { ascending: false })

        if (newLogs) {
          setStatusLogs(newLogs)
        }
      } catch (logError) {
        console.error('Error refreshing status logs:', logError)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('상태 업데이트에 실패했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 콜 담당자 변경 핸들러
  const handleCallAssigneeChange = async (newAssigneeId: string) => {
    if (!selectedLead || !leadDetails) return

    setUpdatingCallAssignee(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          call_assigned_to: newAssigneeId || null,
        }),
      })

      if (!response.ok) throw new Error('콜 담당자 업데이트 실패')

      // 로컬 상태 업데이트
      const newAssignee = teamMembers.find(m => m.id === newAssigneeId)
      setLeadDetails({
        ...leadDetails,
        call_assigned_to: newAssigneeId || null,
        call_assigned_user: newAssignee ? { id: newAssignee.id, full_name: newAssignee.full_name } : null
      })
    } catch (error) {
      console.error('Call assignee update error:', error)
      alert('콜 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCallAssignee(false)
    }
  }

  // 상담 담당자 변경 핸들러
  const handleCounselorChange = async (newCounselorId: string) => {
    if (!selectedLead || !leadDetails) return

    setUpdatingCounselor(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          counselor_assigned_to: newCounselorId || null,
        }),
      })

      if (!response.ok) throw new Error('상담 담당자 업데이트 실패')

      // 로컬 상태 업데이트
      const newCounselor = teamMembers.find(m => m.id === newCounselorId)
      setLeadDetails({
        ...leadDetails,
        counselor_assigned_to: newCounselorId || null,
        counselor_assigned_user: newCounselor ? { id: newCounselor.id, full_name: newCounselor.full_name } : null
      })
    } catch (error) {
      console.error('Counselor update error:', error)
      alert('상담 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCounselor(false)
    }
  }


  // Generate calendar days
  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filter Banner */}
      {statusFilter && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-medium">
              🔍 {STATUS_LABELS[statusFilter] || statusFilter} 필터가 적용되었습니다
            </span>
            <span className="text-sm text-emerald-600">
              ({leads.length}건)
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="px-3 py-1 text-sm text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            필터 해제
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-md transition"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={today}
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition"
              >
                오늘
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-md transition"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View mode selector */}
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                월
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                주
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                  viewMode === 'day'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                일
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedEvent(null)
                setSelectedDate(new Date())
                setShowEventModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              일정 추가
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <div className="p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="bg-gray-50 min-h-[120px]" />
              }

              const dayEvents = getEventsForDay(day)
              const dayLeads = getLeadsForDay(day)
              const isTodayDay = isToday(day)
              const totalItems = dayEvents.length + dayLeads.length

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isTodayDay
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                        : index % 7 === 0
                        ? 'text-red-600'
                        : index % 7 === 6
                        ? 'text-blue-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {day}
                  </div>

                  {/* Events and Leads */}
                  <div className="space-y-1">
                    {/* Display events first (max 2) */}
                    {dayEvents.slice(0, 2).map((event: any) => (
                      <div
                        key={`event-${event.id}`}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`text-xs px-2 py-1 rounded border-l-2 truncate ${
                          EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS]
                        }`}
                      >
                        {formatTime(event.start_time)}{' '}
                        {event.title}
                      </div>
                    ))}
                    {/* Display leads (remaining slots from max 3 total) */}
                    {(() => {
                      const eventsShown = Math.min(dayEvents.length, 2)
                      const leadsToShow = Math.max(0, 3 - eventsShown)
                      const displayedLeads = dayLeads.slice(0, leadsToShow)
                      const hiddenCount = totalItems - eventsShown - displayedLeads.length

                      return (
                        <>
                          {displayedLeads.map((lead: Lead) => (
                            <div
                              key={`lead-${lead.id}`}
                              onClick={(e) => handleLeadClick(lead, e)}
                              className={`text-xs px-2 py-1 rounded border-l-2 truncate flex items-center gap-1 ${
                                LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                              }`}
                            >
                              <UserIcon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{lead.name}</span>
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <div className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 transition">
                              +{hiddenCount}개 더보기
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border-l-2 border-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">전화 상담</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-100 border-l-2 border-purple-500 rounded"></div>
                <span className="text-sm text-gray-600">회의</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-l-2 border-green-500 rounded"></div>
                <span className="text-sm text-gray-600">대면 상담</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border-l-2 border-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">업무</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border-l-2 border-gray-500 rounded"></div>
                <span className="text-sm text-gray-600">기타</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-6 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">DB 신청:</span>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-100 border-l-2 border-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">신규</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-sky-100 border-l-2 border-sky-500 rounded"></div>
                <span className="text-sm text-gray-600">연락완료</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-100 border-l-2 border-emerald-500 rounded"></div>
                <span className="text-sm text-gray-600">상담예정</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-teal-100 border-l-2 border-teal-500 rounded"></div>
                <span className="text-sm text-gray-600">전환완료</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week View - Coming Soon */}
      {viewMode === 'week' && (
        <div className="p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">주간 보기</h3>
          <p className="mt-1 text-sm text-gray-500">주간 보기 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}

      {/* Day View - Coming Soon */}
      {viewMode === 'day' && (
        <div className="p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">일간 보기</h3>
          <p className="mt-1 text-sm text-gray-500">일간 보기 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          date={selectedDate}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onClose={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          onSave={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
            router.refresh()
          }}
        />
      )}

      {/* Day Detail Modal - Shows all events and leads for a specific day */}
      {showDayDetailModal && selectedDayData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {year}년 {month + 1}월 {selectedDayData.day}일
                  </h3>
                  <p className="text-sm text-indigo-100">
                    일정 {selectedDayData.events.length}개 · DB신청 {selectedDayData.leads.length}개
                  </p>
                </div>
                <button
                  onClick={() => setShowDayDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Events Section */}
              {selectedDayData.events.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    일정
                  </h4>
                  <div className="space-y-2">
                    {selectedDayData.events.map((event: any) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowDayDetailModal(false)
                          setShowEventModal(true)
                        }}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${
                          EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS]
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-xs">
                            {formatTime(event.start_time)}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm mt-1 opacity-75 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads Section */}
              {selectedDayData.leads.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    DB 신청
                  </h4>
                  <div className="space-y-2">
                    {selectedDayData.leads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        onClick={(e) => {
                          setShowDayDetailModal(false)
                          handleLeadClick(lead, e)
                        }}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${
                          LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">{lead.name}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-white/50 rounded">
                            {STATUS_STYLES[lead.status]?.label || STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </div>
                        <p className="text-sm mt-1 opacity-75">{lead.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {selectedDayData.events.length === 0 && selectedDayData.leads.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>이 날에는 일정이나 신청이 없습니다</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => handleAddEventFromDay(selectedDayData.day)}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                새 일정 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal - Shows lead information in table format like DB현황 */}
      {showLeadDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">DB 상세 정보</h3>
                  <p className="text-sm text-emerald-100">신청자 상세 정보</p>
                </div>
                <button
                  onClick={() => {
                    setShowLeadDetailModal(false)
                    setSelectedLead(null)
                    setLeadDetails(null)
                    setEditingStatus(false)
                    setStatusLogs([])
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {loadingLeadDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  <span className="ml-3 text-gray-600">로딩 중...</span>
                </div>
              ) : leadDetails ? (
                <div className="space-y-6">
                  {/* 기본 정보 테이블 */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {/* 이름 */}
                        <tr>
                          <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700 w-1/3">이름</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{leadDetails.name || '-'}</td>
                        </tr>
                        {/* 전화번호 */}
                        <tr>
                          <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">전화번호</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{(() => {
                                try {
                                  return decryptPhone(leadDetails.phone)
                                } catch {
                                  return leadDetails.phone || '-'
                                }
                              })()}</span>
                              <a
                                href={`tel:${leadDetails.phone}`}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <PhoneIcon className="h-4 w-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                        {/* 이메일 */}
                        {leadDetails.email && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">이메일</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{leadDetails.email}</td>
                          </tr>
                        )}
                        {/* 상태 */}
                        <tr>
                          <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">상태</td>
                          <td className="px-4 py-3">
                            <div className="relative inline-block">
                              <select
                                value={leadDetails.status}
                                onChange={(e) => handleStatusUpdate(e.target.value)}
                                disabled={updatingStatus}
                                className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-medium cursor-pointer border-0 focus:ring-2 focus:ring-emerald-500 ${
                                  STATUS_STYLES[leadDetails.status]?.bg || 'bg-gray-100'
                                } ${STATUS_STYLES[leadDetails.status]?.text || 'text-gray-800'}`}
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-current opacity-60" />
                              {updatingStatus && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* 콜 담당자 */}
                        <tr>
                          <td className="px-4 py-3 bg-blue-50 text-sm font-medium text-blue-700">콜 담당자</td>
                          <td className="px-4 py-3 bg-blue-50/50">
                            <div className="relative inline-block">
                              <select
                                value={leadDetails.call_assigned_to || ''}
                                onChange={(e) => handleCallAssigneeChange(e.target.value)}
                                disabled={updatingCallAssignee}
                                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium cursor-pointer border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
                              >
                                <option value="">미지정</option>
                                {teamMembers.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.full_name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
                              {updatingCallAssignee && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* 상담 담당자 */}
                        <tr>
                          <td className="px-4 py-3 bg-emerald-50 text-sm font-medium text-emerald-700">상담 담당자</td>
                          <td className="px-4 py-3 bg-emerald-50/50">
                            <div className="relative inline-block">
                              <select
                                value={leadDetails.counselor_assigned_to || ''}
                                onChange={(e) => handleCounselorChange(e.target.value)}
                                disabled={updatingCounselor}
                                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium cursor-pointer border border-emerald-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[140px]"
                              >
                                <option value="">미지정</option>
                                {teamMembers.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.full_name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" />
                              {updatingCounselor && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* 희망 상담일 */}
                        {leadDetails.preferred_date && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">희망 상담일</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(leadDetails.preferred_date)}
                              {leadDetails.preferred_time && ` ${leadDetails.preferred_time}`}
                            </td>
                          </tr>
                        )}
                        {/* 상담 항목 */}
                        {leadDetails.consultation_items && leadDetails.consultation_items.length > 0 && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">상담 항목</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {leadDetails.consultation_items.map((item: string, index: number) => (
                                  <span
                                    key={index}
                                    className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* 메시지 */}
                        {leadDetails.message && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">메시지</td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">{leadDetails.message}</td>
                          </tr>
                        )}
                        {/* 메모 */}
                        {leadDetails.notes && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">메모</td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">{leadDetails.notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 추가 정보 */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">유입 정보</h4>
                    </div>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {/* 랜딩 페이지 */}
                        {leadDetails.landing_pages && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700 w-1/3">랜딩 페이지</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {leadDetails.landing_pages.title || '-'}
                            </td>
                          </tr>
                        )}
                        {/* UTM Source */}
                        {leadDetails.utm_source && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">UTM Source</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{leadDetails.utm_source}</td>
                          </tr>
                        )}
                        {/* UTM Medium */}
                        {leadDetails.utm_medium && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">UTM Medium</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{leadDetails.utm_medium}</td>
                          </tr>
                        )}
                        {/* UTM Campaign */}
                        {leadDetails.utm_campaign && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">UTM Campaign</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{leadDetails.utm_campaign}</td>
                          </tr>
                        )}
                        {/* Referrer */}
                        {leadDetails.referrer && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">Referrer</td>
                            <td className="px-4 py-3 text-sm text-gray-900 break-all">{leadDetails.referrer}</td>
                          </tr>
                        )}
                        {/* 신청일시 */}
                        <tr>
                          <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">신청일시</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDateTime(leadDetails.created_at)}
                          </td>
                        </tr>
                        {/* 예약 확정일 */}
                        {leadDetails.contract_completed_at && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">예약 확정일</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                {formatDate(leadDetails.contract_completed_at)}
                              </div>
                              {leadDetails.previous_contract_completed_at && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  이전: {formatDate(leadDetails.previous_contract_completed_at)}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 상태 변경 이력 */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">상태 변경 이력</h4>
                    </div>
                    <div className="p-4">
                      {loadingStatusLogs ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                          <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
                        </div>
                      ) : statusLogs.length > 0 ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {statusLogs.map((log, index) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 text-sm"
                            >
                              {/* 타임라인 인디케이터 */}
                              <div className="flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                {index < statusLogs.length - 1 && (
                                  <div className="w-0.5 h-full min-h-[20px] bg-gray-200 mt-1"></div>
                                )}
                              </div>
                              {/* 로그 내용 */}
                              <div className="flex-1 pb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    STATUS_STYLES[log.previous_status]?.bg || 'bg-gray-100'
                                  } ${STATUS_STYLES[log.previous_status]?.text || 'text-gray-700'}`}>
                                    {STATUS_STYLES[log.previous_status]?.label || log.previous_status || '없음'}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    STATUS_STYLES[log.new_status]?.bg || 'bg-gray-100'
                                  } ${STATUS_STYLES[log.new_status]?.text || 'text-gray-700'}`}>
                                    {STATUS_STYLES[log.new_status]?.label || log.new_status}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                  <span>{formatDateTime(log.created_at)}</span>
                                  {log.changed_by_user && (
                                    <>
                                      <span className="text-gray-300">|</span>
                                      <span>{log.changed_by_user.full_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">
                          상태 변경 이력이 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLeadDetailModal(false)
                  router.push(`/dashboard/leads?id=${selectedLead.id}`)
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                DB현황에서 보기
              </button>
              <button
                onClick={() => {
                  setShowLeadDetailModal(false)
                  setSelectedLead(null)
                  setLeadDetails(null)
                  setEditingStatus(false)
                  setStatusLogs([])
                }}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
