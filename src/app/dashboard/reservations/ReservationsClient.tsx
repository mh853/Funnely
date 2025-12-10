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
} from '@heroicons/react/24/outline'
import * as XLSX from 'xlsx'

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

  // 예약일 변경 이력 상태
  const [reservationDateLogs, setReservationDateLogs] = useState<any[]>([])
  const [loadingDateLogs, setLoadingDateLogs] = useState(false)

  // 예약일 수정 상태
  const [editingReservationDate, setEditingReservationDate] = useState(false)
  const [reservationDateValue, setReservationDateValue] = useState('')
  const [reservationTimeValue, setReservationTimeValue] = useState('')
  const [updatingReservationDate, setUpdatingReservationDate] = useState(false)

  // 디버깅용 로그
  console.log('ReservationsClient initialLeads:', initialLeads)
  console.log('ReservationsClient leads state:', leads)

  // Handle lead click - open lead detail modal
  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
    setLoadingLeadDetails(true)
    setLoadingDateLogs(true)
    setReservationDateLogs([])

    try {
      // 리드 상세 정보와 예약일 변경 로그를 병렬로 가져옴
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
          .from('reservation_date_logs')
          .select(`
            id,
            previous_date,
            new_date,
            created_at,
            changed_by_user:users!reservation_date_logs_changed_by_fkey(id, full_name)
          `)
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
      ])

      if (leadResult.error) throw leadResult.error
      setLeadDetails(leadResult.data)

      if (!logsResult.error && logsResult.data) {
        setReservationDateLogs(logsResult.data)
      }
    } catch (error) {
      console.error('Error fetching lead details:', error)
    } finally {
      setLoadingLeadDetails(false)
      setLoadingDateLogs(false)
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
      // 날짜와 시간 결합
      const newContractCompletedAt = `${reservationDateValue}T${reservationTimeValue || '00:00'}:00`

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

      // Refresh reservation date logs
      const { data: newLogs } = await supabase
        .from('reservation_date_logs')
        .select(`
          id,
          previous_date,
          new_date,
          created_at,
          changed_by_user:users!reservation_date_logs_changed_by_fkey(id, full_name)
        `)
        .eq('lead_id', leadDetails.id)
        .order('created_at', { ascending: false })

      if (newLogs) {
        setReservationDateLogs(newLogs)
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
    const dateStr = date.toISOString().split('T')[0]
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
    const dateStr = date.toISOString().split('T')[0]
    return leadsByDate[dateStr]?.length || 0
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
      // 날짜와 시간 결합하여 ISO 문자열 생성
      const contractCompletedAt = `${scheduleInputDate}T${scheduleInputTime}:00`

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

  // 날짜별로 리드 그룹화
  const { leadsByDate, sortedDates } = useMemo(() => {
    const grouped: { [key: string]: Lead[] } = {}

    leads.forEach((lead) => {
      if (lead.contract_completed_at) {
        const date = new Date(lead.contract_completed_at).toISOString().split('T')[0]
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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">예약 스케줄</h1>
            <p className="mt-1 text-sm text-emerald-100">
              예약 확정된 일정을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <CalendarDaysIcon className="h-4 w-4" />
                캘린더
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
                리스트
              </button>
            </div>
            {/* 엑셀 다운로드 버튼 */}
            <button
              onClick={handleExcelDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all"
              title="예약 스케줄 엑셀 다운로드"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              엑셀 다운로드
            </button>
            {/* 총 예약 건수 */}
            <div className="text-right">
              <div className="text-3xl font-bold">{leads.length}</div>
              <div className="text-xs text-emerald-100">총 예약 건수</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View (기본 뷰) */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
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
                    className={`py-2.5 text-center text-sm font-semibold ${
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
                        min-h-[70px] p-2 border-t border-l border-gray-100
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
                              <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
            <div className="mt-3 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded"></div>
                <span>오늘</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {getMonthlyContractCount(calendarCurrentMonth.getFullYear(), calendarCurrentMonth.getMonth())}건
                </div>
                <span>이번달 예약</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">|</span>
                <span>날짜 클릭 시 예약 추가 가능</span>
              </div>
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
                  오늘
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
                      const dateStr = day.toISOString().split('T')[0]

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => {
                            if (leadsInSlot.length === 0) {
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
                          className={`p-1 border-r border-gray-100 last:border-r-0 ${
                            isToday ? 'bg-emerald-50/50' : ''
                          } ${leadsInSlot.length === 0 ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-colors`}
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLeadClick(lead)
                                  }}
                                  className="group bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md p-2 text-xs cursor-pointer hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md"
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-semibold truncate">{lead.name}</span>
                                    <span className="text-emerald-100 text-[10px] ml-1">{exactTime}</span>
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
              <span>예약 클릭하여 상세 정보 보기</span>
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

      {/* Lead Detail Modal - Shows lead information in table format like DB현황 */}
      {showLeadDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">예약 상세 정보</h3>
                  <p className="text-sm text-emerald-100">예약 확정 고객 정보</p>
                </div>
                <button
                  onClick={() => {
                    setShowLeadDetailModal(false)
                    setSelectedLead(null)
                    setLeadDetails(null)
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
                            <div className="relative">
                              <select
                                value={leadDetails.status}
                                onChange={(e) => handleStatusUpdate(e.target.value)}
                                disabled={updatingStatus}
                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer appearance-none pr-8 ${
                                  STATUS_STYLES[leadDetails.status]?.bg || 'bg-gray-100'
                                } ${STATUS_STYLES[leadDetails.status]?.text || 'text-gray-800'} border-gray-300 font-medium`}
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                {updatingStatus ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
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
                        {/* 비고 */}
                        <tr>
                          <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">비고</td>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">
                            {leadDetails.notes || <span className="text-gray-400">-</span>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 담당자 정보 */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">담당자 정보</h4>
                    </div>
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200">
                        {/* 콜 담당자 - 드롭다운 (한번 클릭으로 선택 가능) */}
                        <tr>
                          <td className="px-4 py-3 bg-blue-50 text-sm font-medium text-blue-700 w-1/3">콜 담당자</td>
                          <td className="px-4 py-3 text-sm text-gray-900 bg-blue-50/50">
                            <div className="relative">
                              {updatingCallAssignee ? (
                                <div className="flex items-center gap-2 px-2 py-1">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span className="text-gray-500">저장 중...</span>
                                </div>
                              ) : (
                                <select
                                  value={leadDetails.call_assigned_user?.id || ''}
                                  onChange={(e) => handleCallAssigneeChange(leadDetails.id, e.target.value)}
                                  disabled={updatingCallAssignee}
                                  className="w-full max-w-[200px] rounded-lg border border-blue-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer hover:border-blue-400 transition-colors appearance-none"
                                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                                >
                                  <option value="">미배정</option>
                                  {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.full_name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                        {/* 상담 담당자 - 드롭다운 (한번 클릭으로 선택 가능) */}
                        <tr>
                          <td className="px-4 py-3 bg-emerald-50 text-sm font-medium text-emerald-700">상담 담당자</td>
                          <td className="px-4 py-3 text-sm text-gray-900 bg-emerald-50/50">
                            <div className="relative">
                              {updatingCounselor ? (
                                <div className="flex items-center gap-2 px-2 py-1">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                  <span className="text-gray-500">저장 중...</span>
                                </div>
                              ) : (
                                <select
                                  value={leadDetails.counselor_assigned_user?.id || ''}
                                  onChange={(e) => handleCounselorChange(leadDetails.id, e.target.value)}
                                  disabled={updatingCounselor}
                                  className="w-full max-w-[200px] rounded-lg border border-emerald-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white cursor-pointer hover:border-emerald-400 transition-colors appearance-none"
                                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                                >
                                  <option value="">미배정</option>
                                  {teamMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                      {member.full_name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
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
                              {Array.isArray(leadDetails.landing_pages)
                                ? leadDetails.landing_pages[0]?.title || '-'
                                : leadDetails.landing_pages.title || '-'}
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
                        {/* 예약 확정일 - 수정 가능 */}
                        {leadDetails.contract_completed_at && (
                          <tr>
                            <td className="px-4 py-3 bg-amber-50 text-sm font-medium text-amber-700">예약 확정일</td>
                            <td className="px-4 py-3 text-sm text-gray-900 bg-amber-50/50">
                              {editingReservationDate ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="date"
                                      value={reservationDateValue}
                                      onChange={(e) => setReservationDateValue(e.target.value)}
                                      min="2020-01-01"
                                      max="2099-12-31"
                                      className="rounded-lg border border-amber-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                      disabled={updatingReservationDate}
                                    />
                                    <input
                                      type="time"
                                      value={reservationTimeValue}
                                      onChange={(e) => setReservationTimeValue(e.target.value)}
                                      className="rounded-lg border border-amber-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                      disabled={updatingReservationDate}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleReservationDateUpdate}
                                      disabled={updatingReservationDate || !reservationDateValue}
                                      className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                      {updatingReservationDate ? (
                                        <span className="flex items-center gap-1">
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                          저장 중...
                                        </span>
                                      ) : '저장'}
                                    </button>
                                    <button
                                      onClick={() => setEditingReservationDate(false)}
                                      disabled={updatingReservationDate}
                                      className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={handleStartEditReservationDate}
                                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-amber-100 transition group"
                                >
                                  <div>
                                    <div className="font-medium text-amber-800">
                                      {formatDateTime(leadDetails.contract_completed_at)}
                                    </div>
                                    {leadDetails.previous_contract_completed_at && (
                                      <div className="text-xs text-gray-400 mt-0.5">
                                        이전: {formatDateTime(leadDetails.previous_contract_completed_at)}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-amber-600 opacity-0 group-hover:opacity-100 transition">수정</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 예약일 변경 이력 */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-amber-100">
                      <h4 className="text-sm font-medium text-amber-800">예약일 변경 이력</h4>
                    </div>
                    <div className="p-4">
                      {loadingDateLogs ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                          <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
                        </div>
                      ) : reservationDateLogs.length > 0 ? (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {reservationDateLogs.map((log, index) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 text-sm"
                            >
                              {/* 타임라인 인디케이터 */}
                              <div className="flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                {index < reservationDateLogs.length - 1 && (
                                  <div className="w-0.5 h-full min-h-[20px] bg-gray-200 mt-1"></div>
                                )}
                              </div>
                              {/* 로그 내용 */}
                              <div className="flex-1 pb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {log.previous_date ? (
                                    <>
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        {formatDateTime(log.previous_date)}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 mr-1">최초 설정:</span>
                                  )}
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    {formatDateTime(log.new_date)}
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
                          예약일 변경 이력이 없습니다
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
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowLeadDetailModal(false)
                  setSelectedLead(null)
                  setLeadDetails(null)
                  setReservationDateLogs([])
                  setEditingReservationDate(false)
                }}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

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
                          setShowDateLeadsModal(false)
                          setSelectedDateForModal(null)
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
