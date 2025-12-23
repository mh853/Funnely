'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon, CalendarDaysIcon, ChevronDownIcon, CheckIcon, ArrowDownTrayIcon, UserPlusIcon, CircleStackIcon } from '@heroicons/react/24/outline'
import DateRangePicker from '@/components/ui/DateRangePicker'
import { formatDateTime } from '@/lib/utils/date'
import * as XLSX from 'xlsx'
import UnifiedDetailModal from '@/components/shared/UnifiedDetailModal'
import ScheduleRegistrationModal from '@/components/shared/ScheduleRegistrationModal'
import AddLeadModal from '@/components/shared/AddLeadModal'

interface TeamMember {
  id: string
  full_name: string
}

interface LeadStatus {
  id: string
  code: string
  label: string
  color: string
  sort_order: number
  is_default: boolean
}

interface LeadsClientProps {
  leads: any[]
  landingPages: any[]
  teamMembers: TeamMember[]
  totalCount: number
  selectedLeadId?: string  // 캘린더에서 클릭한 특정 리드 ID
  userRole?: string  // 사용자 역할 (감사 로그 표시용)
  leadStatuses?: LeadStatus[]  // 동적 상태 목록
}

// 색상별 Tailwind 클래스 매핑
const COLOR_CLASS_MAP: { [key: string]: { bg: string; text: string } } = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-800' },
  red: { bg: 'bg-red-100', text: 'text-red-800' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  green: { bg: 'bg-green-100', text: 'text-green-800' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  sky: { bg: 'bg-sky-100', text: 'text-sky-800' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
}

// 기본 상태 스타일 (fallback)
const DEFAULT_STATUS_STYLES: { [key: string]: { bg: string; text: string; label: string } } = {
  new: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  contacting: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '상담 거절' },
  contacted: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  qualified: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  converted: { bg: 'bg-green-100', text: 'text-green-800', label: '상담 완료' },
  contract_completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '예약 확정' },
  needs_followup: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '추가상담 필요' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800', label: '기타' },
}

export default function LeadsClient({
  leads: initialLeads,
  landingPages,
  teamMembers,
  totalCount,
  selectedLeadId,
  userRole,
  leadStatuses = [],
}: LeadsClientProps) {
  // 관리자 여부 확인 (simple_role: admin)
  const isAdmin = userRole === 'admin'

  // 동적 상태 스타일 맵 생성
  const statusStyles = useMemo(() => {
    if (leadStatuses.length === 0) return DEFAULT_STATUS_STYLES
    const styles: { [key: string]: { bg: string; text: string; label: string } } = {}
    for (const status of leadStatuses) {
      const colorClasses = COLOR_CLASS_MAP[status.color] || COLOR_CLASS_MAP.gray
      styles[status.code] = {
        bg: colorClasses.bg,
        text: colorClasses.text,
        label: status.label,
      }
    }
    // Fallback for codes not in dynamic statuses
    return { ...DEFAULT_STATUS_STYLES, ...styles }
  }, [leadStatuses])

  // 상태 옵션 목록 생성
  const statusOptions = useMemo(() => {
    if (leadStatuses.length === 0) {
      return [
        { value: 'new', label: '상담 전' },
        { value: 'rejected', label: '상담 거절' },
        { value: 'contacted', label: '상담 진행중' },
        { value: 'converted', label: '상담 완료' },
        { value: 'contract_completed', label: '예약 확정' },
        { value: 'needs_followup', label: '추가상담 필요' },
        { value: 'other', label: '기타' },
      ]
    }
    return leadStatuses.map(s => ({ value: s.code, label: s.label }))
  }, [leadStatuses])
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL 파라미터에서 필터 상태 추출
  const urlDateRange = searchParams.get('dateRange') || ''
  const urlStartDate = searchParams.get('startDate') || ''
  const urlEndDate = searchParams.get('endDate') || ''
  const urlSingleDate = searchParams.get('date') || ''  // 대시보드 그래프에서 클릭한 단일 날짜
  const urlLandingPageId = searchParams.get('landingPageId') || ''
  const urlDeviceType = searchParams.get('deviceType') || ''
  const urlStatus = searchParams.get('status') || ''
  const urlAssignedTo = searchParams.get('assignedTo') || ''
  const urlSearch = searchParams.get('search') || ''

  // 날짜 범위 상태 (Date 객체)
  const [startDate, setStartDate] = useState<Date | null>(() => {
    // 단일 날짜 필터가 가장 우선
    if (urlSingleDate) return new Date(urlSingleDate)
    if (urlStartDate) return new Date(urlStartDate)
    if (urlDateRange) {
      const now = new Date()
      switch (urlDateRange) {
        case '7days': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        case '14days': return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        case '30days': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        case 'all': return null
      }
    }
    // 기본값: 최근 7일
    return new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
  })
  const [endDate, setEndDate] = useState<Date | null>(() => {
    // 단일 날짜 필터가 가장 우선
    if (urlSingleDate) return new Date(urlSingleDate)
    if (urlEndDate) return new Date(urlEndDate)
    if (urlDateRange === 'all') return null
    return new Date()
  })

  const [landingPageId, setLandingPageId] = useState(urlLandingPageId)
  const [deviceType, setDeviceType] = useState(urlDeviceType)
  const [status, setStatus] = useState(urlStatus)
  const [assignedTo, setAssignedTo] = useState(urlAssignedTo)
  const [searchQuery, setSearchQuery] = useState(urlSearch)

  // URL 파라미터가 변경될 때 (router.push 후) 필터 상태 동기화
  useEffect(() => {
    // 단일 날짜 필터가 가장 우선
    if (urlSingleDate) {
      const singleDate = new Date(urlSingleDate)
      setStartDate(singleDate)
      setEndDate(singleDate)
    } else if (urlStartDate) {
      setStartDate(new Date(urlStartDate))
    } else if (urlDateRange) {
      const now = new Date()
      switch (urlDateRange) {
        case '7days':
          setStartDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
          setEndDate(new Date())
          break
        case '14days':
          setStartDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))
          setEndDate(new Date())
          break
        case '30days':
          setStartDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
          setEndDate(new Date())
          break
        case 'all':
          setStartDate(null)
          setEndDate(null)
          break
      }
    }
    if (!urlSingleDate && urlEndDate) {
      setEndDate(new Date(urlEndDate))
    }
    setLandingPageId(urlLandingPageId)
    setDeviceType(urlDeviceType)
    setStatus(urlStatus)
    setAssignedTo(urlAssignedTo)
    setSearchQuery(urlSearch)
  }, [urlDateRange, urlStartDate, urlEndDate, urlSingleDate, urlLandingPageId, urlDeviceType, urlStatus, urlAssignedTo, urlSearch])

  // 로컬 리드 상태 (업데이트 즉시 반영)
  const [leads, setLeads] = useState(initialLeads)

  // 모든 리드에서 custom_fields (JSONB) 수집하여 동적 컬럼 생성
  // 형식: [{ label: "질문명", value: "답변값" }]
  const customFieldColumns = useMemo(() => {
    const fieldsSet = new Set<string>()

    leads.forEach((lead: any) => {
      // 새로운 JSONB custom_fields 확인
      if (lead.custom_fields && Array.isArray(lead.custom_fields)) {
        lead.custom_fields.forEach((field: { label: string; value: string }) => {
          if (field.label) {
            fieldsSet.add(field.label)
          }
        })
      }

      // 기존 custom_field_1~5도 지원 (하위 호환성)
      const collectFields = lead.landing_pages?.collect_fields
      if (Array.isArray(collectFields)) {
        let customFieldIndex = 0
        collectFields.forEach((field: { type: string; question?: string; label?: string }) => {
          if (field.type === 'short_answer' || field.type === 'multiple_choice') {
            const fieldLabel = field.question || field.label || `항목 ${customFieldIndex + 1}`
            fieldsSet.add(fieldLabel)
            customFieldIndex++
          }
        })
      }
    })

    // Set을 배열로 변환하여 반환 (무제한)
    return Array.from(fieldsSet).map((label, index) => ({
      key: `custom_${index}`,
      label
    }))
  }, [leads])

  // 리드에서 커스텀 필드 값 가져오기 (JSONB와 레거시 모두 지원)
  const getCustomFieldValue = useCallback((lead: any, fieldLabel: string): string => {
    // 새로운 JSONB custom_fields에서 찾기
    if (lead.custom_fields && Array.isArray(lead.custom_fields)) {
      const field = lead.custom_fields.find((f: { label: string; value: string }) => f.label === fieldLabel)
      if (field) return field.value
    }

    // 기존 custom_field_1~5에서 찾기 (하위 호환성)
    const collectFields = lead.landing_pages?.collect_fields
    if (Array.isArray(collectFields)) {
      let customFieldIndex = 0
      for (const field of collectFields) {
        if (field.type === 'short_answer' || field.type === 'multiple_choice') {
          const currentLabel = field.question || field.label || `항목 ${customFieldIndex + 1}`
          if (currentLabel === fieldLabel) {
            return lead[`custom_field_${customFieldIndex + 1}`] || ''
          }
          customFieldIndex++
        }
      }
    }

    return ''
  }, [])

  // initialLeads가 변경될 때 (router.refresh() 후) leads 상태 동기화
  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  // 상태 수정 관련 상태
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; openUpward?: boolean } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 계약완료 날짜/시간 입력 모달 상태
  const [contractModalLeadId, setContractModalLeadId] = useState<string | null>(null)
  const [contractDate, setContractDate] = useState('')
  const [contractTime, setContractTime] = useState('')

  // 상세 모달 상태
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [savingPaymentAmount, setSavingPaymentAmount] = useState(false)

  // 리드 추가 모달 상태
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)

  // 결제 내역 관련 상태
  const [payments, setPayments] = useState<any[]>([])
  const [paymentsTotalAmount, setPaymentsTotalAmount] = useState(0)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentNotes, setNewPaymentNotes] = useState('')
  const [addingPayment, setAddingPayment] = useState(false)

  // 감사 로그 관련 상태 (관리자 전용)
  const [paymentAuditLogs, setPaymentAuditLogs] = useState<any[]>([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)

  // 콜 담당자 변경 관련 상태
  const [editingAssigneeLeadId, setEditingAssigneeLeadId] = useState<string | null>(null)
  const [updatingAssigneeLeadId, setUpdatingAssigneeLeadId] = useState<string | null>(null)
  const [assigneeDropdownPosition, setAssigneeDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)

  // 상담 담당자 변경 관련 상태
  const [editingCounselorLeadId, setEditingCounselorLeadId] = useState<string | null>(null)
  const [updatingCounselorLeadId, setUpdatingCounselorLeadId] = useState<string | null>(null)
  const [counselorDropdownPosition, setCounselorDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const counselorDropdownRef = useRef<HTMLDivElement>(null)

  // 변경 이력 관련 상태
  const [changeLogs, setChangeLogs] = useState<any[]>([])
  const [loadingChangeLogs, setLoadingChangeLogs] = useState(false)
  const [showChangeLogs, setShowChangeLogs] = useState(false)

  // 결제 내역 조회 함수
  const fetchPayments = async (leadId: string, existingPaymentAmount?: number) => {
    setLoadingPayments(true)
    try {
      const response = await fetch(`/api/leads/payments?lead_id=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        const fetchedPayments = data.data?.payments || []
        const fetchedTotal = data.data?.totalAmount || 0

        // 기존 payment_amount가 있고, lead_payments 테이블에 데이터가 없는 경우
        // 기존 데이터를 레거시로 표시
        if (fetchedPayments.length === 0 && existingPaymentAmount && existingPaymentAmount > 0) {
          setPayments([{
            id: 'legacy',
            amount: existingPaymentAmount,
            payment_date: null, // 날짜 정보 없음
            notes: '(기존 데이터 - 마이그레이션 필요)',
            isLegacy: true,
          }])
          setPaymentsTotalAmount(existingPaymentAmount)
        } else {
          setPayments(fetchedPayments)
          setPaymentsTotalAmount(fetchedTotal)
        }
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  // 결제 내역 추가 함수
  const handleAddPayment = async () => {
    if (!selectedLead || !newPaymentAmount) return

    setAddingPayment(true)
    try {
      const amountValue = Number(newPaymentAmount.replace(/,/g, ''))
      const response = await fetch('/api/leads/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          amount: amountValue,
          notes: newPaymentNotes || null,
        }),
      })

      if (!response.ok) throw new Error('결제 내역 추가 실패')

      const data = await response.json()
      setPayments(prev => [data.data.payment, ...prev])
      setPaymentsTotalAmount(data.data.totalAmount)
      setNewPaymentAmount('')
      setNewPaymentNotes('')

      // 리드 목록의 결제금액도 업데이트
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id
            ? { ...lead, payment_amount: data.data.totalAmount }
            : lead
        )
      )
      setSelectedLead({ ...selectedLead, payment_amount: data.data.totalAmount })

      // 감사 로그 새로고침 (관리자이고 감사 로그가 열려있는 경우)
      if (isAdmin && showAuditLogs) {
        fetchPaymentAuditLogs(selectedLead.id)
      }
    } catch (error) {
      console.error('Add payment error:', error)
      alert('결제 내역 추가에 실패했습니다.')
    } finally {
      setAddingPayment(false)
    }
  }

  // 결제 내역 삭제 함수
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('이 결제 내역을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/leads/payments?id=${paymentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('결제 내역 삭제 실패')

      const data = await response.json()
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      setPaymentsTotalAmount(data.data.totalAmount)

      // 리드 목록의 결제금액도 업데이트
      if (selectedLead) {
        setLeads(prevLeads =>
          prevLeads.map(lead =>
            lead.id === selectedLead.id
              ? { ...lead, payment_amount: data.data.totalAmount }
              : lead
          )
        )
        setSelectedLead({ ...selectedLead, payment_amount: data.data.totalAmount })

        // 감사 로그 새로고침 (관리자이고 감사 로그가 열려있는 경우)
        if (isAdmin && showAuditLogs) {
          fetchPaymentAuditLogs(selectedLead.id)
        }
      }
    } catch (error) {
      console.error('Delete payment error:', error)
      alert('결제 내역 삭제에 실패했습니다.')
    }
  }

  // 레거시 결제 데이터 삭제 함수 (leads.payment_amount를 0으로 초기화)
  const handleDeleteLegacyPayment = async () => {
    if (!selectedLead) return
    if (!confirm('기존 결제 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          payment_amount: 0,
        }),
      })

      if (!response.ok) throw new Error('레거시 데이터 삭제 실패')

      // 상태 업데이트
      setPayments([])
      setPaymentsTotalAmount(0)
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id
            ? { ...lead, payment_amount: 0 }
            : lead
        )
      )
      setSelectedLead({ ...selectedLead, payment_amount: 0 })
    } catch (error) {
      console.error('Delete legacy payment error:', error)
      alert('기존 데이터 삭제에 실패했습니다.')
    }
  }

  // 감사 로그 조회 함수 (관리자 전용)
  const fetchPaymentAuditLogs = async (leadId: string) => {
    if (!isAdmin) return

    setLoadingAuditLogs(true)
    try {
      const response = await fetch(`/api/leads/payments/audit?lead_id=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentAuditLogs(data.data?.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  // 변경 이력 조회 함수
  const fetchChangeLogs = async (leadId: string) => {
    setLoadingChangeLogs(true)
    try {
      const response = await fetch(`/api/leads/change-logs?lead_id=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setChangeLogs(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch change logs:', error)
    } finally {
      setLoadingChangeLogs(false)
    }
  }

  // 필드 타입 한글 라벨
  const getFieldTypeLabel = (fieldType: string) => {
    const labels: Record<string, string> = {
      status: '결과',
      call_assigned_to: '콜 담당자',
      counselor_assigned_to: '상담 담당자',
      notes: '비고',
      contract_completed_at: '예약 날짜',
    }
    return labels[fieldType] || fieldType
  }

  // 값 표시 함수 (담당자 ID -> 이름 변환)
  const getDisplayValue = (fieldType: string, value: string | null) => {
    if (!value) return '미지정'

    if (fieldType === 'call_assigned_to' || fieldType === 'counselor_assigned_to') {
      const member = teamMembers.find(m => m.id === value)
      return member?.full_name || '알 수 없음'
    }

    if (fieldType === 'status') {
      const status = statusOptions.find(s => s.value === value)
      return status?.label || value
    }

    if (fieldType === 'notes') {
      return value.length > 30 ? value.substring(0, 30) + '...' : value
    }

    if (fieldType === 'contract_completed_at') {
      return new Date(value).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return value
  }

  // 행 클릭 핸들러 - 상세 모달 열기
  const handleRowClick = (lead: any, e: React.MouseEvent) => {
    // 상태 드롭다운 버튼 클릭은 무시
    const target = e.target as HTMLElement
    if (target.closest('.status-dropdown') || target.closest('.assignee-dropdown')) return

    setSelectedLead(lead)
    setNotesValue(lead.notes || '')
    setPaymentAmount(lead.payment_amount ? String(lead.payment_amount) : '')
    setShowDetailModal(true)
    // 결제 내역 조회 (기존 payment_amount도 전달하여 레거시 데이터 표시)
    fetchPayments(lead.id, lead.payment_amount)
    setNewPaymentAmount('')
    setNewPaymentNotes('')
    // 감사 로그 초기화
    setPaymentAuditLogs([])
    setShowAuditLogs(false)
    // 변경 이력 초기화
    setChangeLogs([])
    setShowChangeLogs(false)
  }

  // 비고 저장 핸들러
  const handleSaveNotes = async () => {
    if (!selectedLead) return

    setSavingNotes(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          notes: notesValue,
        }),
      })

      if (!response.ok) throw new Error('비고 저장 실패')

      // 로컬 상태 업데이트
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id
            ? { ...lead, notes: notesValue }
            : lead
        )
      )
      setSelectedLead({ ...selectedLead, notes: notesValue })
    } catch (error) {
      console.error('Notes save error:', error)
      alert('비고 저장에 실패했습니다.')
    } finally {
      setSavingNotes(false)
    }
  }

  // 결제금액 저장 핸들러
  const handleSavePaymentAmount = async () => {
    if (!selectedLead) return

    setSavingPaymentAmount(true)
    try {
      const amountValue = paymentAmount ? Number(paymentAmount.replace(/,/g, '')) : null
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          payment_amount: amountValue,
        }),
      })

      if (!response.ok) throw new Error('결제금액 저장 실패')

      // 로컬 상태 업데이트
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === selectedLead.id
            ? { ...lead, payment_amount: amountValue }
            : lead
        )
      )
      setSelectedLead({ ...selectedLead, payment_amount: amountValue })
    } catch (error) {
      console.error('Payment amount save error:', error)
      alert('결제금액 저장에 실패했습니다.')
    } finally {
      setSavingPaymentAmount(false)
    }
  }

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (editingLeadId) {
        if (!target.closest('.status-dropdown') && !target.closest('.status-dropdown-menu')) {
          setEditingLeadId(null)
          setDropdownPosition(null)
        }
      }
      if (editingAssigneeLeadId) {
        if (!target.closest('.assignee-dropdown') && !target.closest('.assignee-dropdown-menu')) {
          setEditingAssigneeLeadId(null)
          setAssigneeDropdownPosition(null)
        }
      }
      if (editingCounselorLeadId) {
        if (!target.closest('.counselor-dropdown') && !target.closest('.counselor-dropdown-menu')) {
          setEditingCounselorLeadId(null)
          setCounselorDropdownPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingLeadId, editingAssigneeLeadId, editingCounselorLeadId])

  // 드롭다운 버튼 클릭 시 위치 계산 (화면 하단 가까우면 위로 펼침)
  const handleDropdownToggle = useCallback((leadId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (editingLeadId === leadId) {
      setEditingLeadId(null)
      setDropdownPosition(null)
    } else {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const dropdownHeight = 300 // 드롭다운 예상 높이 (7개 옵션)
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom

      // 아래 공간이 부족하면 위로 펼침
      const shouldOpenUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight

      setDropdownPosition({
        // fixed 포지션에서는 getBoundingClientRect()의 뷰포트 좌표를 그대로 사용
        top: shouldOpenUpward
          ? rect.top - dropdownHeight
          : rect.bottom,
        left: rect.left,
        openUpward: shouldOpenUpward,
      })
      setEditingLeadId(leadId)
    }
  }, [editingLeadId])

  // 콜 담당자 드롭다운 토글
  const handleAssigneeDropdownToggle = useCallback((leadId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (editingAssigneeLeadId === leadId) {
      setEditingAssigneeLeadId(null)
      setAssigneeDropdownPosition(null)
    } else {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      setAssigneeDropdownPosition({
        // fixed 포지션에서는 getBoundingClientRect()의 뷰포트 좌표를 그대로 사용
        top: rect.bottom,
        left: rect.left,
      })
      setEditingAssigneeLeadId(leadId)
      // 다른 드롭다운 닫기
      setEditingCounselorLeadId(null)
      setCounselorDropdownPosition(null)
      setEditingLeadId(null)
      setDropdownPosition(null)
    }
  }, [editingAssigneeLeadId])

  // 상담 담당자 드롭다운 토글
  const handleCounselorDropdownToggle = useCallback((leadId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (editingCounselorLeadId === leadId) {
      setEditingCounselorLeadId(null)
      setCounselorDropdownPosition(null)
    } else {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      setCounselorDropdownPosition({
        // fixed 포지션에서는 getBoundingClientRect()의 뷰포트 좌표를 그대로 사용
        top: rect.bottom,
        left: rect.left,
      })
      setEditingCounselorLeadId(leadId)
      // 다른 드롭다운 닫기
      setEditingAssigneeLeadId(null)
      setAssigneeDropdownPosition(null)
      setEditingLeadId(null)
      setDropdownPosition(null)
    }
  }, [editingCounselorLeadId])

  // 계약완료 모달 열기 (날짜/시간 선택)
  const openContractModal = (leadId: string) => {
    // 기본값: 현재 날짜/시간
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().slice(0, 5)
    setContractDate(dateStr)
    setContractTime(timeStr)
    setContractModalLeadId(leadId)
    setEditingLeadId(null)
    setDropdownPosition(null)
  }

  // 빠른 날짜 선택 핸들러
  const setQuickDate = (daysFromNow: number) => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    setContractDate(date.toISOString().split('T')[0])
  }

  // 계약완료 확정 핸들러
  const confirmContractComplete = async () => {
    if (!contractModalLeadId || !contractDate || !contractTime) {
      alert('날짜와 시간을 선택해주세요.')
      return
    }

    setUpdatingLeadId(contractModalLeadId)
    try {
      const contractCompletedAt = new Date(`${contractDate}T${contractTime}:00`).toISOString()

      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: contractModalLeadId,
          status: 'contract_completed',
          contract_completed_at: contractCompletedAt,
        }),
      })

      if (!response.ok) {
        throw new Error('상태 업데이트 실패')
      }

      // 로컬 상태 업데이트 (기존 날짜를 previous로 이동)
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === contractModalLeadId
            ? {
                ...lead,
                status: 'contract_completed',
                previous_contract_completed_at: lead.contract_completed_at || null,
                contract_completed_at: contractCompletedAt
              }
            : lead
        )
      )
      setContractModalLeadId(null)
    } catch (error) {
      console.error('Contract complete error:', error)
      alert('계약 완료 처리에 실패했습니다.')
    } finally {
      setUpdatingLeadId(null)
    }
  }

  // 상태 변경 핸들러
  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // 계약완료 선택 시 모달 열기
    if (newStatus === 'contract_completed') {
      openContractModal(leadId)
      return
    }

    setUpdatingLeadId(leadId)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        throw new Error('상태 업데이트 실패')
      }

      // 로컬 상태 업데이트 (계약완료→다른 상태: 날짜 이동)
      setLeads(prevLeads =>
        prevLeads.map(lead => {
          if (lead.id !== leadId) return lead

          // 계약완료에서 다른 상태로 변경 시 날짜 이동
          if (lead.status === 'contract_completed' && newStatus !== 'contract_completed') {
            return {
              ...lead,
              status: newStatus,
              previous_contract_completed_at: lead.contract_completed_at || null,
              contract_completed_at: null
            }
          }

          return { ...lead, status: newStatus }
        })
      )
      setEditingLeadId(null)
      setDropdownPosition(null)
    } catch (error) {
      console.error('Status update error:', error)
      alert('상태 업데이트에 실패했습니다.')
    } finally {
      setUpdatingLeadId(null)
    }
  }

  // 담당자 변경 핸들러
  const handleAssigneeChange = async (leadId: string, newAssigneeId: string) => {
    setUpdatingAssigneeLeadId(leadId)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          call_assigned_to: newAssigneeId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('담당자 업데이트 실패')
      }

      // 로컬 상태 업데이트
      const newAssignee = teamMembers.find(m => m.id === newAssigneeId)
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId
            ? {
                ...lead,
                call_assigned_to: newAssigneeId || null,
                call_assigned_user: newAssignee ? { id: newAssignee.id, full_name: newAssignee.full_name } : null
              }
            : lead
        )
      )
      setEditingAssigneeLeadId(null)
    } catch (error) {
      console.error('Assignee update error:', error)
      alert('콜 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingAssigneeLeadId(null)
    }
  }

  // 상담 담당자 변경 핸들러
  const handleCounselorChange = async (leadId: string, newCounselorId: string) => {
    setUpdatingCounselorLeadId(leadId)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          counselor_assigned_to: newCounselorId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('상담 담당자 업데이트 실패')
      }

      // 로컬 상태 업데이트
      const newCounselor = teamMembers.find(m => m.id === newCounselorId)
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId
            ? {
                ...lead,
                counselor_assigned_to: newCounselorId || null,
                counselor_assigned_user: newCounselor ? { id: newCounselor.id, full_name: newCounselor.full_name } : null
              }
            : lead
        )
      )
      setEditingCounselorLeadId(null)
    } catch (error) {
      console.error('Counselor update error:', error)
      alert('상담 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCounselorLeadId(null)
    }
  }

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: '상담 전',
      pending: '상담 전',
      contacting: '상담 진행중',
      rejected: '상담 거절',
      contacted: '상담 진행중',
      qualified: '상담 진행중',
      converted: '상담 완료',
      contract_completed: '예약 확정',
      needs_followup: '추가상담 필요',
      other: '기타',
    }
    return labels[status] || status
  }

  // 날짜 포맷 (yyyy-mm-dd)
  const formatDateForUrl = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setStartDate(start)
    setEndDate(end)
  }

  // 실시간 필터링을 위한 debounce 타이머 ref
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // 필터 변경 시 자동으로 URL 업데이트 (debounce 적용)
  useEffect(() => {
    // 초기 마운트 시에는 실행하지 않음 (URL에서 이미 필터가 적용되어 있으므로)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current)
    }

    filterTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams()

      // 날짜 범위 설정
      if (startDate && endDate) {
        params.set('startDate', formatDateForUrl(startDate))
        params.set('endDate', formatDateForUrl(endDate))
      } else if (!startDate && !endDate) {
        params.set('dateRange', 'all')
      }

      if (landingPageId) params.set('landingPageId', landingPageId)
      if (deviceType) params.set('deviceType', deviceType)
      if (status) params.set('status', status)
      if (assignedTo) params.set('assignedTo', assignedTo)
      if (searchQuery) params.set('search', searchQuery)
      params.set('page', '1')

      router.push(`/dashboard/leads?${params.toString()}`)
    }, 100) // 100ms debounce - 빠른 반응

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, landingPageId, deviceType, status, assignedTo, searchQuery])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/dashboard/leads?${params.toString()}`)
    setCurrentPage(page)
  }

  const handleExcelExport = () => {
    if (!leads || leads.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    try {
      // 엑셀 데이터 생성 (사용자 경험 최적화 - 한글 헤더, 정리된 순서)
      const excelData = leads.map((lead: any, index: number) => {
        // 상태 라벨 가져오기
        const statusLabel = statusStyles[lead.status]?.label || lead.status || '-'

        // 콜 담당자 이름 가져오기
        const callAssignedUserName = lead.call_assigned_user?.full_name || '-'
        // 상담 담당자 이름 가져오기
        const counselorAssignedUserName = lead.counselor_assigned_user?.full_name || '-'

        // custom_fields 데이터 파싱
        let customFieldsData: { [key: string]: string } = {}
        if (lead.custom_fields) {
          try {
            const fields = typeof lead.custom_fields === 'string'
              ? JSON.parse(lead.custom_fields)
              : lead.custom_fields
            if (Array.isArray(fields)) {
              fields.forEach((field: any) => {
                if (field.label && field.value !== undefined) {
                  customFieldsData[field.label] = String(field.value)
                }
              })
            } else if (typeof fields === 'object') {
              Object.entries(fields).forEach(([key, value]) => {
                customFieldsData[key] = String(value || '')
              })
            }
          } catch (e) {
            // 파싱 실패 시 무시
          }
        }

        return {
          '번호': index + 1,
          'DB 신청일': formatDateTime(lead.created_at),
          '랜딩페이지': lead.landing_pages?.title || '-',
          '이름': lead.name || '-',
          '전화번호': lead.phone || '-',
          '기기': lead.device_type
            ? (lead.device_type.toLowerCase() === 'unknown'
                ? '알수없음'
                : lead.device_type.toLowerCase() === 'manual'
                  ? 'DB수동추가'
                  : lead.device_type.toUpperCase())
            : '-',
          '결과': statusLabel,
          '예약일': formatDateTime(lead.contract_completed_at),
          '결제금액': lead.lead_payments && lead.lead_payments.length > 0
            ? lead.lead_payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toLocaleString() + '원'
            : '-',
          '비고': lead.memo || '-',
          '콜 담당자': callAssignedUserName,
          '상담 담당자': counselorAssignedUserName,
          'UTM_Source': lead.utm_source || '-',
          'UTM_Medium': lead.utm_medium || '-',
          'UTM_Campaign': lead.utm_campaign || '-',
          // 추가 정보 (엑셀에만 포함)
          'utm_content': lead.utm_content || '-',
          'utm_term': lead.utm_term || '-',
          'Referrer': lead.referrer || '-',
          'IP 주소': lead.ip_address || '-',
          'User Agent': lead.user_agent || '-',
          // 커스텀 필드들 (동적으로 추가)
          ...customFieldsData,
        }
      })

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // 컬럼 너비 설정 (사용자 경험 향상)
      const columnWidths = [
        { wch: 5 },   // 번호
        { wch: 18 },  // DB 신청일
        { wch: 20 },  // 랜딩페이지
        { wch: 10 },  // 이름
        { wch: 15 },  // 전화번호
        { wch: 8 },   // 기기
        { wch: 12 },  // 결과
        { wch: 12 },  // 예약일
        { wch: 12 },  // 결제금액
        { wch: 30 },  // 비고
        { wch: 10 },  // 콜 담당자
        { wch: 10 },  // 상담 담당자
        { wch: 15 },  // UTM_Source
        { wch: 15 },  // UTM_Medium
        { wch: 20 },  // UTM_Campaign
        { wch: 15 },  // utm_content
        { wch: 15 },  // utm_term
        { wch: 30 },  // Referrer
        { wch: 15 },  // IP 주소
        { wch: 50 },  // User Agent
      ]
      worksheet['!cols'] = columnWidths

      // 워크북 생성
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DB 현황')

      // 파일명 생성 (현재 날짜 포함)
      const today = new Date()
      const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
      const fileName = `DB현황_${dateStr}.xlsx`

      // 파일 다운로드
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error('Excel export error:', error)
      alert('엑셀 내보내기 중 오류가 발생했습니다.')
    }
  }

  // 필터 해제 (전체 목록으로 이동 - 모든 날짜 범위 포함)
  const handleClearFilter = async () => {
    // Next.js App Router 방식: push 후 refresh로 서버 컴포넌트 재실행
    router.push('/dashboard/leads?dateRange=all')
    router.refresh()
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <CircleStackIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 현황</h1>
            <p className="text-xs text-gray-500 mt-0.5">랜딩페이지에서 수집된 고객 DB를 관리하세요</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddLeadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            DB 수동 추가
          </button>
          <button
            onClick={handleExcelExport}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* 필터 알림 배너 (URL에서 status, deviceType, date가 설정된 경우) */}
      {(urlStatus || urlDeviceType || urlSingleDate) && !selectedLeadId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <span className="text-emerald-600 text-lg">🔍</span>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">
                {urlSingleDate && `${urlSingleDate} 날짜`}
                {urlSingleDate && (urlStatus || urlDeviceType) && ' + '}
                {urlStatus && (statusStyles[urlStatus]?.label || urlStatus)}
                {urlStatus && urlDeviceType && ' + '}
                {urlDeviceType && (urlDeviceType === 'pc' ? 'PC' : urlDeviceType === 'mobile' ? 'Mobile' : urlDeviceType)}
                {' '}필터가 적용되었습니다 ({totalCount}건)
              </p>
              <p className="text-xs text-emerald-600">
                전체 목록을 보려면 필터 해제 버튼을 클릭하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleClearFilter}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
            필터 해제
          </button>
        </div>
      )}

      {/* 특정 리드 필터링 알림 배너 */}
      {selectedLeadId && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CalendarDaysIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                캘린더에서 선택한 DB 신청 정보를 표시하고 있습니다
              </p>
              <p className="text-xs text-indigo-600">
                전체 목록을 보려면 필터 해제 버튼을 클릭하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleClearFilter}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
            필터 해제
          </button>
        </div>
      )}

      {/* Filters - 한 행 레이아웃 */}
      <div className="bg-white rounded-xl shadow-lg p-4 space-y-3">
        {/* 검색 결과 카운트 표시 */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              📊 검색 결과:
            </span>
            <span className="text-sm font-semibold text-indigo-600">
              {leads.length}건
            </span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-sm text-gray-500">
              전체 {totalCount}건
            </span>
          </div>

          {(startDate || endDate || landingPageId || deviceType || status || assignedTo || searchQuery) && (
            <button
              onClick={handleClearFilter}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
            >
              <XMarkIcon className="h-3 w-3" />
              필터 초기화
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* 날짜 범위 */}
          <div className="flex-shrink-0 w-72">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              📅 날짜 범위
            </label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
              placeholder="날짜 범위 선택"
            />
          </div>

          {/* Landing Page */}
          <div className="flex-shrink-0 w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              랜딩페이지
            </label>
            <select
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {landingPages?.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>

          {/* Device */}
          <div className="flex-shrink-0 w-24">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              기기
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pc">PC</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* Result */}
          <div className="flex-shrink-0 w-32">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              결과
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div className="flex-shrink-0 w-28">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              담당자
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              {teamMembers?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              검색
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 전화번호 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  DB 신청일
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  랜딩페이지 이름
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  전화번호
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  기기
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  결과
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  예약일
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  결제금액
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  비고
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  콜 담당자
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  상담 담당자
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  UTM_Source
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  UTM_Medium
                </th>
                <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  UTM_Campaign
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!leads || leads.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-sm text-gray-400">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={(e) => handleRowClick(lead, e)}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(lead.created_at)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-900 max-w-[150px]">
                      <span className="truncate block" title={lead.landing_pages?.title || ''}>
                        {lead.landing_pages?.title ? (
                          lead.landing_pages.title.length > 15
                            ? `${lead.landing_pages.title.slice(0, 15)}...`
                            : lead.landing_pages.title
                        ) : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 max-w-[80px]">
                      <span className="truncate block" title={lead.name || ''}>
                        {lead.name ? (
                          lead.name.length > 5
                            ? `${lead.name.slice(0, 5)}...`
                            : lead.name
                        ) : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-900 max-w-[110px]">
                      <span className="truncate block" title={lead.phone || ''}>
                        {lead.phone ? (
                          lead.phone.length > 13
                            ? `${lead.phone.slice(0, 13)}...`
                            : lead.phone
                        ) : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      {lead.device_type
                        ? (lead.device_type.toLowerCase() === 'unknown'
                            ? '알수없음'
                            : lead.device_type.toLowerCase() === 'manual'
                              ? 'DB수동추가'
                              : lead.device_type.toUpperCase())
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                      <div className="relative inline-block status-dropdown">
                        {/* 상태 배지 (클릭 가능) */}
                        <button
                          onClick={(e) => handleDropdownToggle(lead.id, e)}
                          disabled={updatingLeadId === lead.id}
                          className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full transition-all ${
                            statusStyles[lead.status]?.bg || 'bg-gray-100'
                          } ${statusStyles[lead.status]?.text || 'text-gray-800'} ${
                            updatingLeadId === lead.id
                              ? 'opacity-50 cursor-wait'
                              : 'hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 cursor-pointer'
                          }`}
                        >
                          {updatingLeadId === lead.id ? (
                            <>
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              저장 중...
                            </>
                          ) : (
                            <>
                              {statusStyles[lead.status]?.label || getStatusLabel(lead.status)}
                              <ChevronDownIcon className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(lead.contract_completed_at)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      {lead.lead_payments && lead.lead_payments.length > 0 ? (
                        <span className="font-medium text-emerald-600">
                          {lead.lead_payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0).toLocaleString()}원
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[150px]">
                      <span className="truncate block" title={lead.notes || ''}>
                        {lead.notes || '-'}
                      </span>
                    </td>
                    {/* 콜 담당자 */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      <div className="relative inline-block assignee-dropdown">
                        <button
                          onClick={(e) => handleAssigneeDropdownToggle(lead.id, e)}
                          disabled={updatingAssigneeLeadId === lead.id}
                          className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 text-sm text-blue-700 cursor-pointer hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-w-[100px]"
                        >
                          {updatingAssigneeLeadId === lead.id ? (
                            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <>
                              <span className="truncate">{lead.call_assigned_user?.full_name || '미지정'}</span>
                              <ChevronDownIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    {/* 상담 담당자 */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                      <div className="relative inline-block counselor-dropdown">
                        <button
                          onClick={(e) => handleCounselorDropdownToggle(lead.id, e)}
                          disabled={updatingCounselorLeadId === lead.id}
                          className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 text-sm text-emerald-700 cursor-pointer hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors min-w-[100px]"
                        >
                          {updatingCounselorLeadId === lead.id ? (
                            <svg className="animate-spin h-4 w-4 text-emerald-600" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <>
                              <span className="truncate">{lead.counselor_assigned_user?.full_name || '미지정'}</span>
                              <ChevronDownIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-sm text-gray-600 max-w-[100px]">
                      <span className="truncate block" title={lead.utm_source || ''}>
                        {lead.utm_source || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-sm text-gray-600 max-w-[100px]">
                      <span className="truncate block" title={lead.utm_medium || ''}>
                        {lead.utm_medium || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-sm text-gray-600 max-w-[120px]">
                      <span className="truncate block" title={lead.utm_campaign || ''}>
                        {lead.utm_campaign || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}

              {totalPages > 5 && (
                <>
                  <span className="px-2 text-sm text-gray-500">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portal 드롭다운 메뉴 - 테이블 외부에 렌더링 */}
      {editingLeadId && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="status-dropdown-menu fixed z-50 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-80 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
        >
          {statusOptions.map((option) => {
            const currentLead = leads.find(l => l.id === editingLeadId)
            return (
              <button
                key={option.value}
                onClick={() => handleStatusChange(editingLeadId, option.value)}
                disabled={updatingLeadId === editingLeadId}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  currentLead?.status === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                }`}
              >
                <span>{option.label}</span>
                {currentLead?.status === option.value && (
                  <CheckIcon className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}

      {/* 콜 담당자 Portal 드롭다운 메뉴 */}
      {editingAssigneeLeadId && assigneeDropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={assigneeDropdownRef}
          className="assignee-dropdown-menu fixed z-50 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-80 overflow-y-auto"
          style={{
            top: assigneeDropdownPosition.top,
            left: assigneeDropdownPosition.left,
          }}
        >
          {/* 미지정 옵션 */}
          <button
            onClick={() => {
              handleAssigneeChange(editingAssigneeLeadId, '')
              setEditingAssigneeLeadId(null)
              setAssigneeDropdownPosition(null)
            }}
            disabled={updatingAssigneeLeadId === editingAssigneeLeadId}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
              !leads.find(l => l.id === editingAssigneeLeadId)?.call_assigned_user?.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            <span>미지정</span>
            {!leads.find(l => l.id === editingAssigneeLeadId)?.call_assigned_user?.id && (
              <CheckIcon className="h-4 w-4 text-blue-600" />
            )}
          </button>
          {/* 팀원 목록 */}
          {teamMembers.map((member) => {
            const currentLead = leads.find(l => l.id === editingAssigneeLeadId)
            const isSelected = currentLead?.call_assigned_user?.id === member.id
            return (
              <button
                key={member.id}
                onClick={() => {
                  handleAssigneeChange(editingAssigneeLeadId, member.id)
                  setEditingAssigneeLeadId(null)
                  setAssigneeDropdownPosition(null)
                }}
                disabled={updatingAssigneeLeadId === editingAssigneeLeadId}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span>{member.full_name}</span>
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-blue-600" />
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}

      {/* 상담 담당자 Portal 드롭다운 메뉴 */}
      {editingCounselorLeadId && counselorDropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={counselorDropdownRef}
          className="counselor-dropdown-menu fixed z-50 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-80 overflow-y-auto"
          style={{
            top: counselorDropdownPosition.top,
            left: counselorDropdownPosition.left,
          }}
        >
          {/* 미지정 옵션 */}
          <button
            onClick={() => {
              handleCounselorChange(editingCounselorLeadId, '')
              setEditingCounselorLeadId(null)
              setCounselorDropdownPosition(null)
            }}
            disabled={updatingCounselorLeadId === editingCounselorLeadId}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
              !leads.find(l => l.id === editingCounselorLeadId)?.counselor_assigned_user?.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
            }`}
          >
            <span>미지정</span>
            {!leads.find(l => l.id === editingCounselorLeadId)?.counselor_assigned_user?.id && (
              <CheckIcon className="h-4 w-4 text-emerald-600" />
            )}
          </button>
          {/* 팀원 목록 */}
          {teamMembers.map((member) => {
            const currentLead = leads.find(l => l.id === editingCounselorLeadId)
            const isSelected = currentLead?.counselor_assigned_user?.id === member.id
            return (
              <button
                key={member.id}
                onClick={() => {
                  handleCounselorChange(editingCounselorLeadId, member.id)
                  setEditingCounselorLeadId(null)
                  setCounselorDropdownPosition(null)
                }}
                disabled={updatingCounselorLeadId === editingCounselorLeadId}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                  isSelected ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                }`}
              >
                <span>{member.full_name}</span>
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}

      {/* 계약완료 날짜/시간 선택 모달 */}
      {contractModalLeadId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarDaysIcon className="h-6 w-6" />
                예약 완료 일정 등록
              </h3>
              <p className="text-sm text-emerald-100 mt-1">
                예약 일정에 표시될 날짜와 시간을 선택하세요
              </p>
            </div>

            {/* 본문 */}
            <div className="p-5 space-y-5">
              {/* 고객 정보 */}
              {(() => {
                const lead = leads.find(l => l.id === contractModalLeadId)
                return lead ? (
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-bold">{lead.name?.[0] || '?'}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.phone || '-'}</div>
                    </div>
                  </div>
                ) : null
              })()}

              {/* 빠른 날짜 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  빠른 선택
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      contractDate === new Date().toISOString().split('T')[0]
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    오늘
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      (() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        return contractDate === tomorrow.toISOString().split('T')[0]
                      })()
                        ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    내일
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(7)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      (() => {
                        const nextWeek = new Date()
                        nextWeek.setDate(nextWeek.getDate() + 7)
                        return contractDate === nextWeek.toISOString().split('T')[0]
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
                  날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-gray-900"
                />
              </div>

              {/* 시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시간 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setContractTime(time)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                        contractTime === time
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
                  value={contractTime}
                  onChange={(e) => setContractTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-gray-900"
                />
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-5 bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={() => setContractModalLeadId(null)}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-100 transition-all"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmContractComplete}
                disabled={updatingLeadId === contractModalLeadId || !contractDate || !contractTime}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {updatingLeadId === contractModalLeadId ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    처리 중...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5" />
                    저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 통합 상세 모달 */}
      <UnifiedDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        lead={selectedLead}
        teamMembers={teamMembers}
        statusOptions={statusOptions}
        statusStyles={statusStyles}
        onUpdate={() => router.refresh()}
      />

      {/* 예약완료일정등록 모달 */}
      <ScheduleRegistrationModal
        isOpen={contractModalLeadId !== null}
        onClose={() => {
          setContractModalLeadId(null)
          setContractDate('')
          setContractTime('')
        }}
        leadId={contractModalLeadId || ''}
        onConfirm={confirmContractComplete}
      />

      {/* 리드 추가 모달 */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onSuccess={() => {
          setShowAddLeadModal(false)
          router.refresh()
        }}
      />
    </>
  )
}
