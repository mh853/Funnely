'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { decryptPhone } from '@/lib/encryption/phone'
import { formatDateTime, formatDate, formatTime } from '@/lib/utils/date'
import {
  XMarkIcon,
  ChevronDownIcon,
  PhoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'
import UnifiedDetailModal from '@/components/shared/UnifiedDetailModal'
import ScheduleRegistrationModal from '@/components/shared/ScheduleRegistrationModal'

interface LandingPage {
  id: string
  title: string
  slug: string
}

interface User {
  id: string
  full_name: string
  email?: string
}

interface Lead {
  id: string
  name: string
  phone: string | null
  status: string
  contract_completed_at: string | null
  previous_contract_completed_at?: string | null
  created_at?: string | null
  notes?: string | null
  landing_pages: LandingPage | LandingPage[] | null
  call_assigned_to?: string | null
  counselor_assigned_to?: string | null
  call_assigned_user?: User | null
  counselor_assigned_user?: User | null
}

interface TeamMember {
  id: string
  full_name: string
}

interface ReservationsClientProps {
  initialLeads: Lead[]
  companyId: string
  teamMembers: TeamMember[]
}

// 캘린더 리드 상태별 색상 (CalendarView와 동일)
const LEAD_STATUS_COLORS = {
  new: 'bg-orange-100 border-orange-500 text-orange-900',
  contacted: 'bg-sky-100 border-sky-500 text-sky-900',
  qualified: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  converted: 'bg-teal-100 border-teal-500 text-teal-900',
  contract_completed: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  lost: 'bg-red-100 border-red-500 text-red-900',
}

// 상태별 스타일 정의 (모달 테이블용 및 변경이력용)
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
  // 필드 타입 (변경 이력용)
  call_assigned_to: { bg: 'bg-blue-100', text: 'text-blue-800', label: '콜 담당자 변경' },
  counselor_assigned_to: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '상담 담당자 변경' },
  contract_completed_at: { bg: 'bg-amber-100', text: 'text-amber-800', label: '예약일 변경' },
  notes: { bg: 'bg-gray-100', text: 'text-gray-800', label: '비고 변경' },
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

export default function ReservationsClient({
  initialLeads,
  companyId,
  teamMembers,
}: ReservationsClientProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const supabase = createClient()

  // Lead detail modal state
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadDetails, setLeadDetails] = useState<any>(null)
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // All leads modal state (날짜별 전체 리스트)
  const [showAllLeadsModal, setShowAllLeadsModal] = useState(false)

  // Date leads modal state (특정 날짜 리스트)
  const [showDateLeadsModal, setShowDateLeadsModal] = useState(false)
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null)

  // Calendar modal state (캘린더 뷰 모달)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date())

  // 뷰 모드 상태 (calendar가 기본값)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  // 주간 캘린더 뷰 상태 (월요일 시작)
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday
    // 월요일을 시작으로 (일요일=0이면 -6, 그 외에는 1-dayOfWeek)
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    return new Date(today.getFullYear(), today.getMonth(), diff)
  })

  // Schedule input modal state (예약 스케줄 수동 입력 모달)
  const [showScheduleInputModal, setShowScheduleInputModal] = useState(false)
  const [scheduleInputDate, setScheduleInputDate] = useState<string>('')
  const [scheduleInputTime, setScheduleInputTime] = useState('10:00')
  const [scheduleInputLeadId, setScheduleInputLeadId] = useState<string>('')
  const [availableLeadsForSchedule, setAvailableLeadsForSchedule] = useState<any[]>([])
  const [loadingAvailableLeads, setLoadingAvailableLeads] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('')
  const [scheduleInputCounselorId, setScheduleInputCounselorId] = useState<string>('')

  // 담당자 변경 상태
  const [updatingCounselor, setUpdatingCounselor] = useState(false)
  const [updatingCallAssignee, setUpdatingCallAssignee] = useState(false)

  // 변경 이력 상태 (통합)
  const [statusLogs, setStatusLogs] = useState<any[]>([])
  const [loadingStatusLogs, setLoadingStatusLogs] = useState(false)

  // 예약일 수정 상태
  const [editingReservationDate, setEditingReservationDate] = useState(false)
  const [reservationDateValue, setReservationDateValue] = useState('')
  const [reservationTimeValue, setReservationTimeValue] = useState('')
  const [updatingReservationDate, setUpdatingReservationDate] = useState(false)

  // 드래그 앤 드롭 상태
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // 디버깅용 로그
  console.log('ReservationsClient initialLeads:', initialLeads)
  console.log('ReservationsClient leads state:', leads)

  // Handle lead click - open lead detail modal
  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
    setLoadingLeadDetails(true)
    setLoadingStatusLogs(true)
    setStatusLogs([])

    try {
      // 리드 상세 정보와 변경 이력을 병렬로 가져옴
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
            field_type,
            previous_value,
            new_value,
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

  // Handle counselor assignment update
  const handleCounselorChange = async (leadId: string, newCounselorId: string) => {
    setUpdatingCounselor(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          counselor_assigned_to: newCounselorId || null,
        }),
      })

      if (!response.ok) throw new Error('상담담당자 업데이트 실패')

      // Update local state
      const newCounselor = teamMembers.find(m => m.id === newCounselorId)
      if (leadDetails) {
        setLeadDetails({
          ...leadDetails,
          counselor_assigned_to: newCounselorId || null,
          counselor_assigned_user: newCounselor ? { id: newCounselor.id, full_name: newCounselor.full_name } : null
        })
      }

      // Refresh change history logs
      try {
        const supabase = createClient()
        const { data: newLogs } = await supabase
          .from('lead_status_logs')
          .select(`
            id,
            previous_status,
            new_status,
            field_type,
            previous_value,
            new_value,
            created_at,
            changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
          `)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })

        if (newLogs) {
          setStatusLogs(newLogs)
        }
      } catch (logError) {
        console.error('Error refreshing status logs:', logError)
      }
    } catch (error) {
      console.error('Counselor update error:', error)
      alert('상담담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCounselor(false)
    }
  }

  // Handle call assignee update
  const handleCallAssigneeChange = async (leadId: string, newAssigneeId: string) => {
    setUpdatingCallAssignee(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          call_assigned_to: newAssigneeId || null,
        }),
      })

      if (!response.ok) throw new Error('콜 담당자 업데이트 실패')

      // Update local state
      const newAssignee = teamMembers.find(m => m.id === newAssigneeId)
      if (leadDetails) {
        setLeadDetails({
          ...leadDetails,
          call_assigned_to: newAssigneeId || null,
          call_assigned_user: newAssignee ? { id: newAssignee.id, full_name: newAssignee.full_name } : null
        })
      }

      // Refresh change history logs
      try {
        const supabase = createClient()
        const { data: newLogs } = await supabase
          .from('lead_status_logs')
          .select(`
            id,
            previous_status,
            new_status,
            field_type,
            previous_value,
            new_value,
            created_at,
            changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
          `)
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })

        if (newLogs) {
          setStatusLogs(newLogs)
        }
      } catch (logError) {
        console.error('Error refreshing status logs:', logError)
      }
    } catch (error) {
      console.error('Call assignee update error:', error)
      alert('콜 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCallAssignee(false)
    }
  }

  // Handle reservation date edit start
  const handleStartEditReservationDate = () => {
    if (leadDetails?.contract_completed_at) {
      const date = new Date(leadDetails.contract_completed_at)
      setReservationDateValue(date.toISOString().split('T')[0])
      // 시간 추출 (HH:mm 형식)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      setReservationTimeValue(`${hours}:${minutes}`)
    }
    setEditingReservationDate(true)
  }

  // Handle reservation date update
  const handleReservationDateUpdate = async () => {
    if (!leadDetails || !reservationDateValue) return

    setUpdatingReservationDate(true)
    try {
      // 날짜와 시간 결합 (한국 시간대 명시)
      const newContractCompletedAt = `${reservationDateValue}T${reservationTimeValue || '00:00'}:00+09:00`

      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadDetails.id,
          status: 'contract_completed',
          contract_completed_at: newContractCompletedAt,
        }),
      })

      if (!response.ok) throw new Error('예약일 업데이트 실패')

      // Update local leadDetails
      setLeadDetails({
        ...leadDetails,
        contract_completed_at: newContractCompletedAt,
      })

      // Update leads list (for calendar refresh)
      setLeads(prevLeads =>
        prevLeads.map(l =>
          l.id === leadDetails.id
            ? { ...l, contract_completed_at: newContractCompletedAt }
            : l
        )
      )

      // Refresh change history logs
      const { data: newLogs } = await supabase
        .from('lead_status_logs')
        .select(`
          id,
          previous_status,
          new_status,
          field_type,
          previous_value,
          new_value,
          created_at,
          changed_by_user:users!lead_status_logs_changed_by_fkey(id, full_name)
        `)
        .eq('lead_id', leadDetails.id)
        .order('created_at', { ascending: false })

      if (newLogs) {
        setStatusLogs(newLogs)
      }

      setEditingReservationDate(false)
    } catch (error) {
      console.error('Reservation date update error:', error)
      alert('예약일 변경에 실패했습니다.')
    } finally {
      setUpdatingReservationDate(false)
    }
  }

  // Handle date header click - open date leads modal
  const handleDateClick = (date: string) => {
    setSelectedDateForModal(date)
    setShowDateLeadsModal(true)
  }

  // Calendar modal helpers
  const goToPrevMonth = () => {
    setCalendarCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCalendarCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToCurrentMonth = () => {
    setCalendarCurrentMonth(new Date())
  }

  // 주간 네비게이션
  const goToPrevWeek = () => {
    setWeekStartDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))
  }

  const goToNextWeek = () => {
    setWeekStartDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))
  }

  const goToCurrentWeek = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    // 월요일 시작으로 (일요일=0이면 -6, 그 외에는 1-dayOfWeek)
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    setWeekStartDate(new Date(today.getFullYear(), today.getMonth(), diff))
  }

  // 주간 날짜 배열 생성
  const getWeekDays = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + i)
      days.push(date)
    }
    return days
  }

  // 시간 슬롯 생성 (09:00 ~ 20:00)
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ]

  // 특정 날짜와 시간에 해당하는 리드 찾기
  const getLeadsForTimeSlot = (date: Date, timeSlot: string) => {
    const dateStr = getLocalDateString(date)
    const dayLeads = leadsByDate[dateStr] || []

    return dayLeads.filter(lead => {
      if (!lead.contract_completed_at) return false
      const leadTime = new Date(lead.contract_completed_at)
      const leadHour = leadTime.getHours().toString().padStart(2, '0')
      const slotHour = timeSlot.split(':')[0]
      return leadHour === slotHour
    })
  }

  // 특정 날짜의 리드 수
  const getLeadCountForDay = (date: Date) => {
    const dateStr = getLocalDateString(date)
    return leadsByDate[dateStr]?.length || 0
  }

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
    // 드래그 중 투명도 설정
    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLead(null)
    setDragOverSlot(null)
    setIsDragging(false)
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
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

    // 로컬 날짜 문자열 생성 (YYYY-MM-DD 형식)
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const localDateStr = `${year}-${month}-${day}`

    // 한국 시간대를 명시적으로 포함하여 저장
    // PostgreSQL timestamptz가 올바른 시간으로 해석하도록 함
    const newContractCompletedAt = `${localDateStr}T${targetTime}:00+09:00`

    // 같은 위치면 무시 (로컬 타임존 기준)
    if (draggedLead.contract_completed_at) {
      const currentDate = new Date(draggedLead.contract_completed_at)
      const currentYear = currentDate.getFullYear()
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
      const currentDay = String(currentDate.getDate()).padStart(2, '0')
      const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`
      const currentHour = currentDate.getHours().toString().padStart(2, '0')
      const targetHour = targetTime.split(':')[0]
      if (currentDateStr === localDateStr && currentHour === targetHour) {
        return
      }
    }

    // 낙관적 업데이트
    const updatedLeads = leads.map(l =>
      l.id === draggedLead.id
        ? { ...l, contract_completed_at: newContractCompletedAt }
        : l
    )
    setLeads(updatedLeads)

    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draggedLead.id,
          status: 'contract_completed',
          contract_completed_at: newContractCompletedAt,
        }),
      })

      if (!response.ok) {
        throw new Error('스케줄 업데이트 실패')
      }

      router.refresh()
    } catch (error) {
      console.error('Schedule update error:', error)
      // 롤백
      setLeads(initialLeads)
      alert('스케줄 변경에 실패했습니다.')
    }
  }

  // Generate calendar days for a given month
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday

    const days: (number | null)[] = []

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  // Get lead count for a specific date
  const getLeadCountForDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leadsByDate[dateStr]?.length || 0
  }

  // Get leads for a specific date (캘린더 셀에 표시용)
  const getLeadsForDate = (year: number, month: number, day: number): Lead[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leadsByDate[dateStr] || []
  }

  // Handle calendar date click - 기존 예약 있으면 목록 보기, 없으면 새 예약 입력 모달
  const handleCalendarDateClick = async (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (leadsByDate[dateStr] && leadsByDate[dateStr].length > 0) {
      // 기존 예약이 있으면 목록 모달
      setShowCalendarModal(false)
      setSelectedDateForModal(dateStr)
      setShowDateLeadsModal(true)
    } else {
      // 예약이 없으면 새 예약 입력 모달
      setScheduleInputDate(dateStr)
      setScheduleInputTime('10:00')
      setScheduleInputLeadId('')
      setShowScheduleInputModal(true)

      // 계약 완료 상태가 아닌 리드 목록 가져오기 (상담완료 상태 등)
      setLoadingAvailableLeads(true)
      setScheduleSearchQuery('')
      try {
        const { data, error } = await supabase
          .from('leads')
          .select(`
            id,
            name,
            phone,
            status,
            landing_pages (
              id,
              title
            )
          `)
          .eq('company_id', companyId)
          .neq('status', 'contract_completed')
          .neq('status', 'rejected')
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error
        setAvailableLeadsForSchedule(data || [])
      } catch (error) {
        console.error('Error fetching available leads:', error)
        setAvailableLeadsForSchedule([])
      } finally {
        setLoadingAvailableLeads(false)
      }
    }
  }

  // 예약 스케줄 저장
  const handleSaveSchedule = async () => {
    if (!scheduleInputLeadId || !scheduleInputDate) {
      alert('고객과 날짜를 선택해주세요.')
      return
    }

    setSavingSchedule(true)
    try {
      // 날짜와 시간 결합하여 ISO 문자열 생성 (한국 시간대 명시)
      const contractCompletedAt = `${scheduleInputDate}T${scheduleInputTime}:00+09:00`

      const updateBody: any = {
        id: scheduleInputLeadId,
        status: 'contract_completed',
        contract_completed_at: contractCompletedAt
      }

      // 상담담당자가 선택된 경우 추가
      if (scheduleInputCounselorId) {
        updateBody.counselor_assigned_to = scheduleInputCounselorId
      }

      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      })

      if (!response.ok) throw new Error('예약 스케줄 저장 실패')

      // 성공 시 해당 리드 정보 가져와서 로컬 상태 업데이트
      const { data: updatedLead } = await supabase
        .from('leads')
        .select(`
          *,
          landing_pages (
            id,
            title,
            slug
          )
        `)
        .eq('id', scheduleInputLeadId)
        .single()

      if (updatedLead) {
        setLeads(prev => {
          const exists = prev.find(l => l.id === updatedLead.id)
          if (exists) {
            return prev.map(l => l.id === updatedLead.id ? updatedLead as Lead : l)
          }
          return [...prev, updatedLead as Lead]
        })
      }

      setShowScheduleInputModal(false)
      setShowCalendarModal(false)
      setScheduleInputCounselorId('')  // 상담담당자 선택 초기화
      alert('예약 스케줄이 저장되었습니다.')
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('예약 스케줄 저장에 실패했습니다.')
    } finally {
      setSavingSchedule(false)
    }
  }

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    if (leads.length === 0) {
      alert('다운로드할 예약 데이터가 없습니다.')
      return
    }

    try {
      // 데이터 가공
      const excelData = await Promise.all(
        leads.map(async (lead) => {
          // 랜딩페이지 이름 가져오기
          const landingPageTitle = lead.landing_pages
            ? Array.isArray(lead.landing_pages)
              ? lead.landing_pages[0]?.title || '-'
              : lead.landing_pages.title || '-'
            : '-'

          // 전화번호 복호화
          let phoneDisplay = '-'
          if (lead.phone) {
            try {
              const decrypted = await decryptPhone(lead.phone)
              phoneDisplay = decrypted || '-'
            } catch {
              phoneDisplay = lead.phone
            }
          }

          // 예약일시 포맷팅
          const reservationDate = lead.contract_completed_at
            ? formatDate(new Date(lead.contract_completed_at))
            : '-'
          const reservationTime = lead.contract_completed_at
            ? formatTime(new Date(lead.contract_completed_at))
            : '-'

          // 상담 담당자 이름 찾기
          const counselorName = lead.counselor_assigned_to
            ? teamMembers.find((m) => m.id === lead.counselor_assigned_to)?.full_name || '-'
            : '-'

          // 콜 담당자 이름 찾기
          const callAssigneeName = lead.call_assigned_to
            ? teamMembers.find((m) => m.id === lead.call_assigned_to)?.full_name || '-'
            : '-'

          // 신청일시 포맷팅
          const createdAtFormatted = lead.created_at
            ? formatDateTime(lead.created_at)
            : '-'

          return {
            '고객명': lead.name || '-',
            '연락처': phoneDisplay,
            '예약일': reservationDate,
            '예약시간': reservationTime,
            '콜담당자': callAssigneeName,
            '상담담당자': counselorName,
            '유입경로': landingPageTitle,
            '신청일시': createdAtFormatted,
            '비고': lead.notes || '-',
          }
        })
      )

      // 예약일 기준으로 정렬
      excelData.sort((a, b) => {
        const dateA = a['예약일'] === '-' ? '' : a['예약일']
        const dateB = b['예약일'] === '-' ? '' : b['예약일']
        return dateA.localeCompare(dateB)
      })

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // 컬럼 너비 설정
      worksheet['!cols'] = [
        { wch: 12 }, // 고객명
        { wch: 15 }, // 연락처
        { wch: 12 }, // 예약일
        { wch: 10 }, // 예약시간
        { wch: 12 }, // 콜담당자
        { wch: 12 }, // 상담담당자
        { wch: 20 }, // 유입경로
        { wch: 18 }, // 신청일시
        { wch: 30 }, // 비고
      ]

      // 워크북 생성 및 시트 추가
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '예약 스케줄')

      // 파일명 생성 (현재 날짜 포함)
      const today = new Date()
      const fileName = `예약스케줄_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`

      // 다운로드
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Excel download error:', error)
      alert('엑셀 다운로드에 실패했습니다.')
    }
  }

  // 해당 월의 계약 완료 건수 계산
  const getMonthlyContractCount = (year: number, month: number) => {
    let count = 0
    leads.forEach(lead => {
      if (lead.contract_completed_at) {
        const date = new Date(lead.contract_completed_at)
        if (date.getFullYear() === year && date.getMonth() === month) {
          count++
        }
      }
    })
    return count
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
      setLeads(leads.map(l =>
        l.id === selectedLead.id ? { ...l, ...updatedData } : l
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('상태 업데이트에 실패했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Supabase Realtime 구독
  useEffect(() => {
    console.log('Setting up Realtime subscription for companyId:', companyId)

    // leads 테이블의 변경사항 구독
    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          console.log('🔔 Realtime update received:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newLead = payload.new as any

            // contract_completed 상태이고 contract_completed_at이 있는 경우만 처리
            if (
              newLead.status === 'contract_completed' &&
              newLead.contract_completed_at
            ) {
              // landing_pages 정보를 가져오기 위해 추가 쿼리
              const { data: leadWithRelations } = await supabase
                .from('leads')
                .select(
                  `
                  *,
                  landing_pages (
                    id,
                    title,
                    slug
                  )
                `
                )
                .eq('id', newLead.id)
                .single()

              if (leadWithRelations) {
                setLeads((prevLeads) => {
                  // 기존에 있는 리드인지 확인
                  const existingIndex = prevLeads.findIndex(
                    (l) => l.id === leadWithRelations.id
                  )

                  if (existingIndex >= 0) {
                    // 업데이트: 기존 리드 교체
                    const updated = [...prevLeads]
                    updated[existingIndex] = leadWithRelations as Lead
                    return updated
                  } else {
                    // 새로 추가
                    return [...prevLeads, leadWithRelations as Lead]
                  }
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              // 상태가 contract_completed가 아니게 변경된 경우 목록에서 제거
              const updatedLead = payload.new as any
              if (updatedLead.status !== 'contract_completed') {
                setLeads((prevLeads) =>
                  prevLeads.filter((l) => l.id !== updatedLead.id)
                )
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // 삭제된 리드 제거
            const deletedLead = payload.old as any
            setLeads((prevLeads) =>
              prevLeads.filter((l) => l.id !== deletedLead.id)
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status)
      })

    // 클린업
    return () => {
      console.log('🔌 Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [companyId, supabase])

  // 로컬 날짜 문자열 생성 헬퍼 함수
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 날짜별로 리드 그룹화
  const { leadsByDate, sortedDates } = useMemo(() => {
    const grouped: { [key: string]: Lead[] } = {}

    leads.forEach((lead) => {
      if (lead.contract_completed_at) {
        // 로컬 타임존 기준 날짜 문자열 생성
        const leadDate = new Date(lead.contract_completed_at)
        const date = getLocalDateString(leadDate)
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(lead)
      }
    })

    // 각 날짜 내에서 시간순 정렬
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = new Date(a.contract_completed_at!).getTime()
        const timeB = new Date(b.contract_completed_at!).getTime()
        return timeA - timeB
      })
    })

    return {
      leadsByDate: grouped,
      sortedDates: Object.keys(grouped).sort(),
    }
  }, [leads])

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">예약 스케줄</h1>
            <p className="text-xs text-gray-500 mt-0.5">예약 확정된 일정을 관리합니다</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              캘린더
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListBulletIcon className="h-3.5 w-3.5" />
              리스트
            </button>
          </div>
          {/* 엑셀 다운로드 버튼 */}
          <button
            onClick={handleExcelDownload}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl gap-2"
            title="예약 스케줄 엑셀 다운로드"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            엑셀 다운로드
          </button>
          {/* 총 예약 건수 */}
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 gap-1">
            <span className="text-lg font-bold">{leads.length}</span>
            <span className="text-xs">건</span>
          </div>
        </div>
      </div>

      {/* Calendar View (기본 뷰) */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header - DB 스케줄 캘린더와 동일한 스타일 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {calendarCurrentMonth.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 hover:bg-gray-100 rounded-md transition"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={goToCurrentMonth}
                    className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    이번달
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-md transition"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {generateCalendarDays(
                calendarCurrentMonth.getFullYear(),
                calendarCurrentMonth.getMonth()
              ).map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[120px]" />
                }

                const dayLeads = getLeadsForDate(
                  calendarCurrentMonth.getFullYear(),
                  calendarCurrentMonth.getMonth(),
                  day
                )
                const isToday =
                  new Date().toDateString() ===
                  new Date(
                    calendarCurrentMonth.getFullYear(),
                    calendarCurrentMonth.getMonth(),
                    day
                  ).toDateString()
                const dayOfWeek = idx % 7

                // 최대 3개 표시, 나머지는 "더보기"
                const displayedLeads = dayLeads.slice(0, 3)
                const hiddenCount = dayLeads.length - displayedLeads.length

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      handleCalendarDateClick(
                        calendarCurrentMonth.getFullYear(),
                        calendarCurrentMonth.getMonth(),
                        day
                      )
                    }}
                    className="bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition"
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday
                          ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                          : dayOfWeek === 0
                          ? 'text-red-600'
                          : dayOfWeek === 6
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {day}
                    </div>

                    {/* Leads */}
                    <div className="space-y-1">
                      {displayedLeads.map((lead) => (
                        <div
                          key={`lead-${lead.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeadClick(lead)
                          }}
                          className={`text-xs px-2 py-1 rounded border-l-2 truncate flex items-center gap-1 ${
                            LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                          }`}
                        >
                          <UserIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{lead.name}</span>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <div className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded hover:bg-emerald-100 transition">
                          +{hiddenCount}개 더보기
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Calendar View (주간 캘린더 뷰) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Week Navigation */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevWeek}
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
                  onClick={goToCurrentWeek}
                  className="ml-2 px-3 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full hover:bg-emerald-100 transition"
                >
                  이번달
                </button>
              </div>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-white rounded-lg transition shadow-sm border border-gray-200"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Weekly Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <div className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200">
                  시간
                </div>
                {getWeekDays().map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString()
                  const dayOfWeek = day.getDay()
                  const leadCount = getLeadCountForDay(day)
                  return (
                    <div
                      key={idx}
                      className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${
                        isToday ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className={`text-xs font-medium ${
                        dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-500'
                      }`}>
                        {day.toLocaleDateString('ko-KR', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-bold ${
                        isToday ? 'text-emerald-600' :
                        dayOfWeek === 0 ? 'text-red-600' :
                        dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {day.getDate()}
                      </div>
                      {leadCount > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold bg-emerald-500 text-white rounded-full">
                            {leadCount}건
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Time Slots */}
              <div className="divide-y divide-gray-100">
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[60px]">
                    {/* Time Label */}
                    <div className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50 border-r border-gray-200 flex items-start justify-center pt-3">
                      {timeSlot}
                    </div>

                    {/* Day Cells */}
                    {getWeekDays().map((day, dayIdx) => {
                      const isToday = day.toDateString() === new Date().toDateString()
                      const leadsInSlot = getLeadsForTimeSlot(day, timeSlot)
                      const dateStr = getLocalDateString(day)
                      const slotId = `${dateStr}-${timeSlot}`
                      const isDropTarget = dragOverSlot === slotId

                      return (
                        <div
                          key={dayIdx}
                          onDragOver={(e) => handleDragOver(e, slotId)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, timeSlot)}
                          onClick={() => {
                            if (leadsInSlot.length === 0 && !isDragging) {
                              // 빈 슬롯 클릭 시 예약 추가 모달
                              setScheduleInputDate(dateStr)
                              setScheduleInputTime(timeSlot)
                              setScheduleInputLeadId('')
                              setShowScheduleInputModal(true)
                              setLoadingAvailableLeads(true)
                              setScheduleSearchQuery('')
                              supabase
                                .from('leads')
                                .select(`id, name, phone, status, landing_pages (id, title)`)
                                .eq('company_id', companyId)
                                .neq('status', 'contract_completed')
                                .neq('status', 'rejected')
                                .order('created_at', { ascending: false })
                                .limit(200)
                                .then(({ data }) => {
                                  setAvailableLeadsForSchedule(data || [])
                                  setLoadingAvailableLeads(false)
                                })
                            }
                          }}
                          className={`p-1 border-r border-gray-100 last:border-r-0 min-h-[60px] transition-all duration-200 ${
                            isToday ? 'bg-emerald-50/50' : ''
                          } ${leadsInSlot.length === 0 && !isDragging ? 'hover:bg-gray-50 cursor-pointer' : ''} ${
                            isDropTarget ? 'bg-emerald-100 ring-2 ring-emerald-400 ring-inset scale-[1.02]' : ''
                          } ${isDragging && !isDropTarget ? 'hover:bg-gray-50' : ''}`}
                        >
                          <div className="space-y-1">
                            {leadsInSlot.map((lead) => {
                              const phone = lead.phone ? decryptPhone(lead.phone) : null
                              const exactTime = formatTime(lead.contract_completed_at!)
                              const landingPage = Array.isArray(lead.landing_pages)
                                ? lead.landing_pages[0]
                                : lead.landing_pages

                              return (
                                <div
                                  key={lead.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, lead)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLeadClick(lead)
                                  }}
                                  className={`group bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md p-2 text-xs cursor-grab active:cursor-grabbing hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md overflow-hidden ${
                                    draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5 min-w-0">
                                    <span className="font-semibold truncate min-w-0 flex-1">{lead.name}</span>
                                    <span className="text-emerald-100 text-[10px] flex-shrink-0">{exactTime}</span>
                                  </div>
                                  {phone && (
                                    <div className="text-emerald-100 text-[10px] truncate">{phone}</div>
                                  )}
                                  {landingPage?.title && (
                                    <div className="text-emerald-200 text-[10px] truncate mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {landingPage.title}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {/* 빈 슬롯에 드롭 힌트 표시 */}
                          {isDropTarget && leadsInSlot.length === 0 && (
                            <div className="h-full min-h-[40px] flex items-center justify-center text-xs text-emerald-500 font-medium">
                              여기에 놓기
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend & Tips */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded"></div>
              <span>오늘</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded"></div>
              <span>예약</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">|</span>
              <span>빈 시간 클릭하여 예약 추가</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">|</span>
              <span>예약을 드래그하여 시간 변경</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setShowAllLeadsModal(true)}
          className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-emerald-600 bg-white border-2 border-emerald-600 rounded-full hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          모든 예약 확정 건 보기
        </button>
      </div>

      {/* 통합 상세 모달 */}
      <UnifiedDetailModal
        isOpen={showLeadDetailModal}
        onClose={() => {
          setShowLeadDetailModal(false)
          setSelectedLead(null)
          setLeadDetails(null)
          setStatusLogs([])
          setEditingReservationDate(false)
        }}
        lead={leadDetails}
        teamMembers={teamMembers}
        statusOptions={STATUS_OPTIONS}
        statusStyles={STATUS_STYLES}
        onUpdate={() => router.refresh()}
      />

      {/* All Leads Modal - 날짜별 전체 리스트 */}
      {showAllLeadsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">모든 계약 완료 건</h3>
                  <p className="text-sm text-emerald-100">총 {leads.length}건의 계약 완료</p>
                </div>
                <button
                  onClick={() => setShowAllLeadsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {sortedDates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>계약 완료 건이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedDates.map((date) => {
                    const dateLeads = leadsByDate[date]
                    const dateObj = new Date(date)
                    const formattedDate = dateObj.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })

                    return (
                      <div key={date} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Date Section Header */}
                        <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
                              {dateObj.getDate()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{formattedDate}</div>
                              <div className="text-xs text-gray-500">{dateLeads.length}건</div>
                            </div>
                          </div>
                        </div>

                        {/* Leads List */}
                        <div className="divide-y divide-gray-100">
                          {dateLeads.map((lead) => {
                            const time = formatTime(lead.contract_completed_at!)
                            const phone = lead.phone ? decryptPhone(lead.phone) : null
                            const landingPage = Array.isArray(lead.landing_pages)
                              ? lead.landing_pages[0]
                              : lead.landing_pages

                            return (
                              <div
                                key={lead.id}
                                onClick={() => {
                                  setShowAllLeadsModal(false)
                                  handleLeadClick(lead)
                                }}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="text-sm font-medium text-emerald-600 w-16">{time}</div>
                                  <div>
                                    <div className="font-medium text-gray-900">{lead.name}</div>
                                    {landingPage?.title && (
                                      <div className="text-xs text-gray-500">{landingPage.title}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {phone && (
                                    <span className="text-sm text-gray-500">{phone}</span>
                                  )}
                                  <svg
                                    className="w-4 h-4 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowAllLeadsModal(false)}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Leads Modal - 특정 날짜 리스트 */}
      {showDateLeadsModal && selectedDateForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {new Date(selectedDateForModal).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </h3>
                  <p className="text-sm text-emerald-100">
                    {leadsByDate[selectedDateForModal]?.length || 0}건의 예약
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDateLeadsModal(false)
                    setSelectedDateForModal(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {!leadsByDate[selectedDateForModal] || leadsByDate[selectedDateForModal].length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>해당 날짜에 예약이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadsByDate[selectedDateForModal].map((lead) => {
                    const time = formatTime(lead.contract_completed_at!)
                    const phone = lead.phone ? decryptPhone(lead.phone) : null
                    const landingPage = Array.isArray(lead.landing_pages)
                      ? lead.landing_pages[0]
                      : lead.landing_pages

                    return (
                      <div
                        key={lead.id}
                        onClick={() => {
                          // 날짜 리스트 모달을 닫지 않고 상세 모달만 열어서 뒤로가기 UX 개선
                          handleLeadClick(lead)
                        }}
                        className="bg-gray-50 rounded-xl p-4 hover:bg-emerald-50 cursor-pointer transition border border-gray-200 hover:border-emerald-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                              {time}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{lead.name}</div>
                              {phone && (
                                <div className="text-sm text-gray-500">{phone}</div>
                              )}
                              {landingPage?.title && (
                                <div className="text-xs text-emerald-600 mt-1">{landingPage.title}</div>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <button
                onClick={async () => {
                  // 예약 추가 모달 열기
                  setShowDateLeadsModal(false)
                  setScheduleInputDate(selectedDateForModal || '')
                  setScheduleInputTime('10:00')
                  setScheduleInputLeadId('')
                  setShowScheduleInputModal(true)
                  setLoadingAvailableLeads(true)
                  setScheduleSearchQuery('')

                  // 예약 가능한 리드 조회 (contract_completed, rejected 제외)
                  const { data: availableLeads } = await supabase
                    .from('leads')
                    .select(`id, name, phone, status, landing_pages (id, title)`)
                    .eq('company_id', companyId)
                    .neq('status', 'contract_completed')
                    .neq('status', 'rejected')
                    .order('created_at', { ascending: false })
                    .limit(200)

                  setAvailableLeadsForSchedule(availableLeads || [])
                  setLoadingAvailableLeads(false)
                }}
                className="px-4 py-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                예약 추가
              </button>
              <button
                onClick={() => {
                  setShowDateLeadsModal(false)
                  setSelectedDateForModal(null)
                }}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal - 캘린더 뷰 */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    캘린더 뷰
                  </h3>
                  <p className="text-sm text-emerald-100">총 {leads.length}건의 계약 완료</p>
                </div>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={goToPrevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <h4 className="text-xl font-bold text-gray-900">
                  {calendarCurrentMonth.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </h4>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 bg-gray-50">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div
                      key={day}
                      className={`py-3 text-center text-sm font-semibold ${
                        idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {generateCalendarDays(
                    calendarCurrentMonth.getFullYear(),
                    calendarCurrentMonth.getMonth()
                  ).map((day, idx) => {
                    const leadCount = day
                      ? getLeadCountForDate(
                          calendarCurrentMonth.getFullYear(),
                          calendarCurrentMonth.getMonth(),
                          day
                        )
                      : 0
                    const isToday =
                      day &&
                      new Date().toDateString() ===
                        new Date(
                          calendarCurrentMonth.getFullYear(),
                          calendarCurrentMonth.getMonth(),
                          day
                        ).toDateString()
                    const dayOfWeek = idx % 7

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (day) {
                            handleCalendarDateClick(
                              calendarCurrentMonth.getFullYear(),
                              calendarCurrentMonth.getMonth(),
                              day
                            )
                          }
                        }}
                        className={`
                          min-h-[80px] p-2 border-t border-l border-gray-100
                          ${day ? 'cursor-pointer hover:bg-emerald-50' : ''}
                          ${isToday ? 'bg-emerald-50' : ''}
                          ${!day ? 'bg-gray-50' : ''}
                        `}
                      >
                        {day && (
                          <>
                            <div
                              className={`text-sm font-medium mb-1 ${
                                isToday
                                  ? 'text-emerald-600'
                                  : dayOfWeek === 0
                                  ? 'text-red-500'
                                  : dayOfWeek === 6
                                  ? 'text-blue-500'
                                  : 'text-gray-700'
                              }`}
                            >
                              {day}
                            </div>
                            {leadCount > 0 && (
                              <div className="flex items-center justify-center">
                                <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                  {leadCount}건
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded"></div>
                  <span>오늘</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {getMonthlyContractCount(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth())}건
                  </div>
                  <span>이번달 계약 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">|</span>
                  <span>날짜 클릭 시 예약 추가 가능</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Input Modal - 예약 스케줄 수동 입력 */}
      {showScheduleInputModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">예약 스케줄 입력</h3>
                  <p className="text-sm text-emerald-100">
                    {scheduleInputDate && new Date(scheduleInputDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowScheduleInputModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 고객 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  고객 선택 <span className="text-red-500">*</span>
                </label>
                {loadingAvailableLeads ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
                  </div>
                ) : availableLeadsForSchedule.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                    <p>예약 가능한 고객이 없습니다.</p>
                    <p className="text-xs mt-1">계약 완료, 상담 거절 상태가 아닌 고객만 선택 가능합니다.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 검색 입력 */}
                    <input
                      type="text"
                      placeholder="이름 또는 연락처로 검색..."
                      value={scheduleSearchQuery}
                      onChange={(e) => setScheduleSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {/* 고객 목록 */}
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                      {(() => {
                        const filteredLeads = availableLeadsForSchedule.filter(lead => {
                          if (!scheduleSearchQuery) return true
                          const query = scheduleSearchQuery.toLowerCase()
                          const name = (lead.name || '').toLowerCase()
                          const phone = lead.phone ? decryptPhone(lead.phone) : ''
                          return name.includes(query) || phone.includes(query)
                        })

                        if (filteredLeads.length === 0) {
                          return (
                            <div className="p-3 text-center text-sm text-gray-500">
                              검색 결과가 없습니다.
                            </div>
                          )
                        }

                        return filteredLeads.map((lead) => {
                          const landingPage = Array.isArray(lead.landing_pages)
                            ? lead.landing_pages[0]
                            : lead.landing_pages
                          const phone = lead.phone ? decryptPhone(lead.phone) : ''
                          const isSelected = scheduleInputLeadId === lead.id

                          return (
                            <div
                              key={lead.id}
                              onClick={() => setScheduleInputLeadId(lead.id)}
                              className={`p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-900">{lead.name}</span>
                                  {phone && <span className="ml-2 text-gray-500 text-sm">({phone})</span>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[lead.status]?.bg || 'bg-gray-100'} ${STATUS_STYLES[lead.status]?.text || 'text-gray-800'}`}>
                                  {STATUS_STYLES[lead.status]?.label || lead.status}
                                </span>
                              </div>
                              {landingPage?.title && (
                                <div className="text-xs text-gray-400 mt-1">{landingPage.title}</div>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                    <p className="text-xs text-gray-400">총 {availableLeadsForSchedule.length}명의 고객</p>
                  </div>
                )}
              </div>

              {/* 빠른 날짜 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  빠른 선택
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleInputDate(new Date().toISOString().split('T')[0])}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      scheduleInputDate === new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setScheduleInputDate(tomorrow.toISOString().split('T')[0])
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      (() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        return scheduleInputDate === tomorrow.toISOString().split('T')[0]
                      })()
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    내일
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextWeek = new Date()
                      nextWeek.setDate(nextWeek.getDate() + 7)
                      setScheduleInputDate(nextWeek.toISOString().split('T')[0])
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      (() => {
                        const nextWeek = new Date()
                        nextWeek.setDate(nextWeek.getDate() + 7)
                        return scheduleInputDate === nextWeek.toISOString().split('T')[0]
                      })()
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    다음주
                  </button>
                </div>
              </div>

              {/* 날짜 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  예약 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduleInputDate}
                  onChange={(e) => setScheduleInputDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* 빠른 시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  예약 시간 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setScheduleInputTime(time)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                        scheduleInputTime === time
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <input
                  type="time"
                  value={scheduleInputTime}
                  onChange={(e) => setScheduleInputTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* 상담 담당자 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상담 담당자
                </label>
                <select
                  value={scheduleInputCounselorId}
                  onChange={(e) => setScheduleInputCounselorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">미배정</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>참고:</strong> 예약 스케줄을 저장하면 해당 고객의 상태가 &apos;계약 완료&apos;로 변경됩니다.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowScheduleInputModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                disabled={savingSchedule}
              >
                취소
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={savingSchedule || !scheduleInputLeadId || !scheduleInputDate}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingSchedule && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                예약 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
