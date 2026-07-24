'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { formatDateTime, formatDate, formatTime } from '@/lib/utils/date'
import { decryptPhone } from '@/lib/encryption/phone'
import UnifiedDetailModal from '@/components/shared/UnifiedDetailModal'
import ScheduleRegistrationModal from '@/components/shared/ScheduleRegistrationModal'
import { useToast } from '@/components/shared/Toast'

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
  viewMode?: 'calendar' | 'list'
  onReservationCountChange?: (count: number) => void
}

type CalendarMode = 'month' | 'week' | 'day'

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
  contacting: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  contacted: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  qualified: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  converted: { bg: 'bg-green-100', text: 'text-green-800', label: '상담 완료' },
  contract_completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '예약 확정' },
  needs_followup: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '추가상담 필요' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800', label: '기타' },
  // 필드 타입 (상태 변경 이력용)
  call_assigned_to: { bg: 'bg-blue-100', text: 'text-blue-800', label: '콜 담당자 변경' },
  counselor_assigned_to: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '상담 담당자 변경' },
  contract_completed_at: { bg: 'bg-amber-100', text: 'text-amber-800', label: '예약 확정일 변경' },
  schedule_change: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '일정 변경' },
  notes: { bg: 'bg-gray-100', text: 'text-gray-800', label: '비고 변경' },
}

// 상태 변경 가능 목록 (회사별 커스텀 상태를 불러오지 못했을 때의 기본값)
const DEFAULT_STATUS_OPTIONS = [
  { value: 'new', label: '상담 전' },
  { value: 'rejected', label: '상담 거절' },
  { value: 'contacting', label: '상담 진행중' },
  { value: 'contacted', label: '상담 진행중' },
  { value: 'converted', label: '상담 완료' },
  { value: 'contract_completed', label: '예약 확정' },
  { value: 'needs_followup', label: '추가상담 필요' },
  { value: 'other', label: '기타' },
]

// localStorage 키 상수
const LEAD_READ_STORAGE_KEY = 'calendar_lead_read_status'

// 읽음 상태 관리 헬퍼 함수
const getLeadReadStatus = (): Record<string, number> => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(LEAD_READ_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const markLeadAsRead = (leadId: string) => {
  if (typeof window === 'undefined') return
  try {
    const readStatus = getLeadReadStatus()
    readStatus[leadId] = Date.now()
    localStorage.setItem(LEAD_READ_STORAGE_KEY, JSON.stringify(readStatus))
  } catch (error) {
    console.error('Failed to save read status:', error)
  }
}

const isLeadRead = (leadId: string): boolean => {
  const readStatus = getLeadReadStatus()
  const readTimestamp = readStatus[leadId]
  if (!readTimestamp) return false

  // 24시간(86400000ms) 이내에 읽었으면 true
  const twentyFourHours = 24 * 60 * 60 * 1000
  return (Date.now() - readTimestamp) < twentyFourHours
}

export default function CalendarView({
  events,
  leads,
  teamMembers,
  currentUserId,
  statusFilter,
  viewMode = 'calendar',
  onReservationCountChange,
}: CalendarViewProps) {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month')

  // 주간 리스트 뷰용 상태 (월요일 시작)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    // 월요일을 시작으로 (일요일=0이면 -6, 그 외에는 1-day)
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(today.getFullYear(), today.getMonth(), diff)
  })
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDayDetailModal, setShowDayDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<{ events: any[], leads: Lead[], day: number } | null>(null)

  // Lead detail modal state
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // 읽음 상태 추적용 state (리렌더링 트리거용)
  const [readStatusVersion, setReadStatusVersion] = useState(0)

  // 캘린더에 표시할 상태만 필터링: 상담 전, 상담 진행중, 추가상담 필요, 기타
  const allowedStatuses = ['new', 'pending', 'contacting', 'contacted', 'qualified', 'needs_followup', 'other']
  const filteredLeads = leads.filter(lead => allowedStatuses.includes(lead.status))
  const [localLeads, setLocalLeads] = useState<Lead[]>(filteredLeads)

  // 드래그 앤 드롭 상태
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 회사별 커스텀 리드 상태 목록
  const [leadStatuses, setLeadStatuses] = useState<
    { id: string; code: string; label: string; color: string; sort_order: number }[]
  >([])

  // 상태 변경 드롭다운에 사용할 옵션 목록 (커스텀 상태 우선, 없으면 기본값)
  const statusOptions = useMemo(() => {
    if (leadStatuses.length === 0) return DEFAULT_STATUS_OPTIONS
    return leadStatuses.map(s => ({ value: s.code, label: s.label }))
  }, [leadStatuses])

  useEffect(() => {
    const fetchLeadStatuses = async () => {
      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', currentUserId)
        .single()

      if (!userProfile?.company_id) return

      const { data } = await supabase
        .from('lead_statuses')
        .select('id, code, label, color, sort_order')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      setLeadStatuses(data || [])
    }
    fetchLeadStatuses()
  }, [currentUserId])

  // 로컬 날짜 문자열 생성 헬퍼 함수
  const getLocalDateString = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // leads prop 변경 시 필터링된 leads로 업데이트
  useEffect(() => {
    const filtered = leads.filter(lead => allowedStatuses.includes(lead.status))
    setLocalLeads(filtered)
  }, [leads])

  // 예약 건수 계산 및 업데이트
  useEffect(() => {
    if (!onReservationCountChange) return

    let count = 0

    if (viewMode === 'calendar') {
      // 월별 캘린더 모드: 현재 월의 예약 건수
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()

      count = localLeads.filter((lead) => {
        // contract_completed_at 기준 (예약 확정일)
        if (lead.contract_completed_at) {
          const completedDate = new Date(lead.contract_completed_at)
          return (
            completedDate.getFullYear() === year &&
            completedDate.getMonth() === month
          )
        }
        // preferred_date 기준
        if (lead.preferred_date) {
          const preferredDate = new Date(lead.preferred_date)
          return (
            preferredDate.getFullYear() === year &&
            preferredDate.getMonth() === month
          )
        }
        // created_at 기준
        const createdDate = new Date(lead.created_at)
        return (
          createdDate.getFullYear() === year &&
          createdDate.getMonth() === month
        )
      }).length
    } else {
      // 주별 리스트 모드: 현재 주의 예약 건수
      const weekEnd = new Date(weekStartDate)
      weekEnd.setDate(weekStartDate.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      count = localLeads.filter((lead) => {
        // contract_completed_at 기준 (예약 확정일)
        if (lead.contract_completed_at) {
          const completedDate = new Date(lead.contract_completed_at)
          return completedDate >= weekStartDate && completedDate <= weekEnd
        }
        // preferred_date 기준
        if (lead.preferred_date) {
          const preferredDate = new Date(lead.preferred_date)
          return preferredDate >= weekStartDate && preferredDate <= weekEnd
        }
        // created_at 기준
        const createdDate = new Date(lead.created_at)
        return createdDate >= weekStartDate && createdDate <= weekEnd
      }).length
    }

    onReservationCountChange(count)
  }, [viewMode, currentDate, weekStartDate, localLeads, onReservationCountChange])

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    // 월요일 시작으로 조정 (일요일=0이면 6, 그 외는 -1)
    const dayOfWeek = firstDay.getDay()
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1

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
    // 필터링된 localLeads 사용
    return localLeads.filter((lead) => {
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
    // 모달에 표시할 leads도 필터링 적용
    const filteredDayLeads = dayLeads.filter(lead => allowedStatuses.includes(lead.status))
    setSelectedDayData({ events: dayEvents, leads: filteredDayLeads, day })
    setShowDayDetailModal(true)
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
    // 읽음 표시
    markLeadAsRead(lead.id)
    setReadStatusVersion(prev => prev + 1) // 리렌더링 트리거
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
  }

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
    // CSS 클래스로 투명도 제어 (draggedLead 상태로 관리)
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setDragOverSlot(null)
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverSlot !== slotId) {
      setDragOverSlot(slotId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // 자식 요소로 이동할 때는 무시
    const relatedTarget = e.relatedTarget as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    if (currentTarget.contains(relatedTarget)) return
    setDragOverSlot(null)
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date, targetTime: string) => {
    e.preventDefault()
    setDragOverSlot(null)

    if (!draggedLead) return

    // 드래그 상태를 먼저 초기화 (반투명 해제)
    const droppedLead = draggedLead
    setDraggedLead(null)
    setIsDragging(false)

    // 로컬 날짜 문자열 생성 (YYYY-MM-DD 형식)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const dayNum = String(targetDate.getDate()).padStart(2, '0')
    const newPreferredDate = `${year}-${month}-${dayNum}`
    const newPreferredTime = targetTime

    // 한국 시간대를 명시적으로 포함하여 저장
    const newContractCompletedAt = `${newPreferredDate}T${targetTime}:00+09:00`

    // 같은 위치면 무시 (로컬 타임존 기준)
    if (droppedLead.contract_completed_at) {
      const currentDate = new Date(droppedLead.contract_completed_at)
      const currentYear = currentDate.getFullYear()
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
      const currentDay = String(currentDate.getDate()).padStart(2, '0')
      const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`
      const currentHour = currentDate.getHours().toString().padStart(2, '0')
      const targetHour = targetTime.split(':')[0]
      if (currentDateStr === newPreferredDate && currentHour === targetHour) {
        return
      }
    } else {
      // preferred_date 또는 created_at 기준 비교
      const currentDate = droppedLead.preferred_date || droppedLead.created_at.split('T')[0]
      const currentTime = droppedLead.preferred_time || new Date(droppedLead.created_at).toTimeString().slice(0, 5)
      if (currentDate === newPreferredDate && currentTime.slice(0, 2) === newPreferredTime.slice(0, 2)) {
        return
      }
    }

    // 낙관적 업데이트 - 상태에 따라 적절한 필드만 업데이트
    const updatedLeads = localLeads.map(l => {
      if (l.id !== droppedLead.id) return l

      if (droppedLead.status === 'contract_completed') {
        // 예약 확정 상태면 contract_completed_at 업데이트
        return {
          ...l,
          contract_completed_at: newContractCompletedAt,
        }
      } else {
        // 그 외 상태면 preferred_date, preferred_time만 업데이트
        return {
          ...l,
          preferred_date: newPreferredDate,
          preferred_time: newPreferredTime,
        }
      }
    })
    setLocalLeads(updatedLeads)

    try {
      // 상태에 따라 업데이트할 필드 결정
      // - 예약 확정 상태: contract_completed_at 업데이트
      // - 그 외 상태: preferred_date, preferred_time 업데이트 (contract_completed_at 없이)
      const updatePayload: any = {
        id: droppedLead.id,
      }

      if (droppedLead.status === 'contract_completed') {
        // 예약 확정 상태면 contract_completed_at 업데이트
        updatePayload.contract_completed_at = newContractCompletedAt
      } else {
        // 그 외 상태면 preferred_date, preferred_time 업데이트
        updatePayload.preferred_date = newPreferredDate
        updatePayload.preferred_time = newPreferredTime
      }

      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        throw new Error('스케줄 업데이트 실패')
      }

      router.refresh()
    } catch (error) {
      console.error('Schedule update error:', error)
      // 롤백 - 필터링된 leads로 복원
      const filtered = leads.filter(lead => allowedStatuses.includes(lead.status))
      setLocalLeads(filtered)
      toast.error('스케줄 변경에 실패했습니다.')
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

      {/* Header - 월별 캘린더 전용 */}
      {viewMode === 'calendar' && (
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
                  이번달
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-md transition"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Calendar Grid - Month View */}
      {viewMode === 'calendar' && (
        <div className="p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  index === 5 ? 'text-blue-600' : index === 6 ? 'text-red-600' : 'text-gray-700'
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
                        : index % 7 === 5
                        ? 'text-blue-600'
                        : index % 7 === 6
                        ? 'text-red-600'
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

        </div>
      )}

      {/* Weekly List View */}
      {viewMode === 'list' && (
        <div className="p-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
            <button
              onClick={() => {
                const newDate = new Date(weekStartDate)
                newDate.setDate(newDate.getDate() - 7)
                setWeekStartDate(newDate)
              }}
              className="p-2 hover:bg-white rounded-lg transition shadow-sm border border-gray-200"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-bold text-gray-900">
                {weekStartDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </h4>
              <span className="text-sm text-gray-500">
                {weekStartDate.getDate()}일 - {new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6).getDate()}일
              </span>
              <button
                onClick={() => {
                  const today = new Date()
                  const day = today.getDay()
                  // 월요일 시작으로 (일요일=0이면 -6, 그 외에는 1-day)
                  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
                  setWeekStartDate(new Date(today.getFullYear(), today.getMonth(), diff))
                }}
                className="ml-2 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition"
              >
                이번달
              </button>
            </div>
            <button
              onClick={() => {
                const newDate = new Date(weekStartDate)
                newDate.setDate(newDate.getDate() + 7)
                setWeekStartDate(newDate)
              }}
              className="p-2 hover:bg-white rounded-lg transition shadow-sm border border-gray-200"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Weekly List Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50 sticky top-0 z-10 rounded-t-lg overflow-hidden">
                <div className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200">
                  시간
                </div>
                {(() => {
                  const days: Date[] = []
                  for (let i = 0; i < 7; i++) {
                    const day = new Date(weekStartDate)
                    day.setDate(weekStartDate.getDate() + i)
                    days.push(day)
                  }
                  return days.map((day, idx) => {
                    const isToday = day.toDateString() === new Date().toDateString()
                    const dayOfWeek = day.getDay()
                    const dayLeads = localLeads.filter(lead => {
                      const leadDate = lead.preferred_date || lead.created_at
                      if (!leadDate) return false
                      const d = new Date(leadDate)
                      return d.toDateString() === day.toDateString()
                    })
                    return (
                      <div
                        key={idx}
                        className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                          isToday ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div className={`text-xs font-medium ${
                          dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-500'
                        }`}>
                          {day.toLocaleDateString('ko-KR', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg font-bold ${
                          isToday ? 'text-indigo-600' :
                          dayOfWeek === 0 ? 'text-red-600' :
                          dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {day.getDate()}
                        </div>
                        {dayLeads.length > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold bg-indigo-500 text-white rounded-full">
                              {dayLeads.length}건
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Time Slots */}
              <div className="divide-y divide-gray-100">
                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[60px]">
                    {/* Time Label */}
                    <div className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200 flex items-start justify-center pt-3">
                      {timeSlot}
                    </div>

                    {/* Day Cells */}
                    {(() => {
                      const days: Date[] = []
                      for (let i = 0; i < 7; i++) {
                        const day = new Date(weekStartDate)
                        day.setDate(weekStartDate.getDate() + i)
                        days.push(day)
                      }
                      return days.map((day, dayIdx) => {
                        const isToday = day.toDateString() === new Date().toDateString()
                        const slotHour = parseInt(timeSlot.split(':')[0])
                        const slotId = `${getLocalDateString(day)}-${timeSlot}`
                        const isDropTarget = dragOverSlot === slotId
                        const leadsInSlot = localLeads.filter(lead => {
                          // contract_completed_at 기준으로 필터링 (예약 확정일)
                          if (lead.contract_completed_at) {
                            const d = new Date(lead.contract_completed_at)
                            if (d.toDateString() !== day.toDateString()) return false
                            const leadHour = d.getHours()
                            return leadHour === slotHour
                          }
                          // preferred_date 기준
                          const leadDate = lead.preferred_date || lead.created_at
                          if (!leadDate) return false
                          const d = new Date(leadDate)
                          if (d.toDateString() !== day.toDateString()) return false
                          const leadTime = lead.preferred_time || d.toTimeString().slice(0, 5)
                          const leadHour = parseInt(leadTime.split(':')[0])
                          return leadHour === slotHour
                        })

                        return (
                          <div
                            key={dayIdx}
                            onDragOver={(e) => handleDragOver(e, slotId)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, timeSlot)}
                            className={`p-1 border-r border-gray-100 last:border-r-0 min-h-[60px] min-w-0 transition-all duration-200 ${
                              isToday ? 'bg-indigo-50/30' : ''
                            } ${isDropTarget ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-inset scale-[1.02]' : ''} ${
                              isDragging && !isDropTarget ? 'hover:bg-gray-50' : ''
                            }`}
                          >
                            {leadsInSlot.map((lead, leadIdx) => (
                              <div
                                key={leadIdx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, lead)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => handleLeadClick(lead, e)}
                                className={`p-1.5 mb-1 rounded text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition overflow-hidden min-w-0 ${
                                  LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || 'bg-gray-100 border-gray-500 text-gray-900'
                                } border-l-2 ${draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''}`}
                              >
                                <div className="font-medium truncate overflow-hidden text-ellipsis">{lead.name}</div>
                                <div className="text-[10px] opacity-75 truncate overflow-hidden text-ellipsis">
                                  {lead.preferred_time || formatTime(lead.created_at)}
                                </div>
                              </div>
                            ))}
                            {/* 빈 슬롯에 드롭 힌트 표시 */}
                            {isDropTarget && leadsInSlot.length === 0 && (
                              <div className="h-full min-h-[40px] flex items-center justify-center text-xs text-indigo-500 font-medium">
                                여기에 놓기
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                    {selectedDayData.leads.map((lead: Lead) => {
                      const isRead = isLeadRead(lead.id)
                      return (
                        <div
                          key={lead.id}
                          onClick={(e) => {
                            // 날짜 모달을 닫지 않고 리드 상세 모달만 열어서 뒤로가기 UX 개선
                            handleLeadClick(lead, e)
                          }}
                          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${
                            LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                          }`}
                        >
                          <div className={`flex items-center justify-between ${isRead ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4" />
                              <span className="font-medium">{lead.name}</span>
                            </div>
                            <span className="text-xs px-2 py-1 bg-white/50 rounded">
                              {STATUS_STYLES[lead.status]?.label || STATUS_LABELS[lead.status] || lead.status}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 truncate ${isRead ? 'opacity-50' : 'opacity-75'}`}>{decryptPhone(lead.phone)}</p>
                        </div>
                      )
                    })}
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
          </div>
        </div>
      )}

      {/* 통합 상세 모달 */}
      <UnifiedDetailModal
        isOpen={showLeadDetailModal}
        onClose={() => {
          setShowLeadDetailModal(false)
          setSelectedLead(null)
        }}
        lead={selectedLead as any}
        teamMembers={teamMembers}
        statusOptions={statusOptions}
        statusStyles={STATUS_STYLES}
        onUpdate={() => router.refresh()}
      />

      {/* 예약완료일정등록 모달 - UnifiedDetailModal 내부에서 처리 */}


    </div>
  )
}
