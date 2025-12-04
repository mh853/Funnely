'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon, CalendarDaysIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { decryptPhone } from '@/lib/encryption/phone'
import DateRangePicker from '@/components/ui/DateRangePicker'

interface LeadsClientProps {
  leads: any[]
  landingPages: any[]
  totalCount: number
  selectedLeadId?: string  // 캘린더에서 클릭한 특정 리드 ID
}

// 상태별 스타일 정의
const STATUS_STYLES: { [key: string]: { bg: string; text: string; label: string } } = {
  new: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  pending: { bg: 'bg-orange-100', text: 'text-orange-800', label: '상담 전' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '상담 거절' },
  contacted: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  qualified: { bg: 'bg-sky-100', text: 'text-sky-800', label: '상담 진행중' },
  converted: { bg: 'bg-green-100', text: 'text-green-800', label: '상담 완료' },
  contract_completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: '계약 완료' },
  needs_followup: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '추가상담 필요' },
  other: { bg: 'bg-gray-100', text: 'text-gray-800', label: '기타' },
}

// 상태 변경 가능 목록
const STATUS_OPTIONS = [
  { value: 'new', label: '상담 전' },
  { value: 'rejected', label: '상담 거절' },
  { value: 'contacted', label: '상담 진행중' },
  { value: 'converted', label: '상담 완료' },
  { value: 'contract_completed', label: '계약 완료' },
  { value: 'needs_followup', label: '추가상담 필요' },
  { value: 'other', label: '기타' },
]

export default function LeadsClient({
  leads: initialLeads,
  landingPages,
  totalCount,
  selectedLeadId,
}: LeadsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL 파라미터에서 필터 상태 추출
  const urlDateRange = searchParams.get('dateRange') || ''
  const urlStartDate = searchParams.get('startDate') || ''
  const urlEndDate = searchParams.get('endDate') || ''
  const urlLandingPageId = searchParams.get('landingPageId') || ''
  const urlDeviceType = searchParams.get('deviceType') || ''
  const urlStatus = searchParams.get('status') || ''
  const urlSearch = searchParams.get('search') || ''

  // 날짜 범위 상태 (Date 객체)
  const [startDate, setStartDate] = useState<Date | null>(() => {
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
    if (urlEndDate) return new Date(urlEndDate)
    if (urlDateRange === 'all') return null
    return new Date()
  })

  const [landingPageId, setLandingPageId] = useState(urlLandingPageId)
  const [deviceType, setDeviceType] = useState(urlDeviceType)
  const [status, setStatus] = useState(urlStatus)
  const [searchQuery, setSearchQuery] = useState(urlSearch)

  // URL 파라미터가 변경될 때 (router.push 후) 필터 상태 동기화
  useEffect(() => {
    if (urlStartDate) {
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
    if (urlEndDate) {
      setEndDate(new Date(urlEndDate))
    }
    setLandingPageId(urlLandingPageId)
    setDeviceType(urlDeviceType)
    setStatus(urlStatus)
    setSearchQuery(urlSearch)
  }, [urlDateRange, urlStartDate, urlEndDate, urlLandingPageId, urlDeviceType, urlStatus, urlSearch])

  // 로컬 리드 상태 (업데이트 즉시 반영)
  const [leads, setLeads] = useState(initialLeads)

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

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingLeadId) {
        const target = event.target as Element
        if (!target.closest('.status-dropdown') && !target.closest('.status-dropdown-menu')) {
          setEditingLeadId(null)
          setDropdownPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingLeadId])

  // 드롭다운 버튼 클릭 시 위치 계산 (화면 하단 가까우면 위로 펼침)
  const handleDropdownToggle = useCallback((leadId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (editingLeadId === leadId) {
      setEditingLeadId(null)
      setDropdownPosition(null)
    } else {
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const dropdownHeight = 340 // 드롭다운 예상 높이 (7개 옵션 + 취소)
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom

      // 아래 공간이 부족하면 위로 펼침
      const shouldOpenUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight

      setDropdownPosition({
        top: shouldOpenUpward
          ? rect.top + window.scrollY - dropdownHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        openUpward: shouldOpenUpward,
      })
      setEditingLeadId(leadId)
    }
  }, [editingLeadId])

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

      // 로컬 상태 업데이트
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId
            ? { ...lead, status: newStatus }
            : lead
        )
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

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: '상담 전',
      pending: '상담 전',
      rejected: '상담 거절',
      contacted: '상담 진행중',
      qualified: '상담 진행중',
      converted: '상담 완료',
      contract_completed: '계약 완료',
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

  const handleFilterChange = () => {
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
    if (searchQuery) params.set('search', searchQuery)
    params.set('page', '1')

    router.push(`/dashboard/leads?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/dashboard/leads?${params.toString()}`)
    setCurrentPage(page)
  }

  const handleExcelExport = () => {
    // Excel export will be implemented later
    alert('Excel 내보내기 기능은 곧 추가될 예정입니다.')
  }

  // 필터 해제 (전체 목록으로 이동 - 모든 날짜 범위 포함)
  const handleClearFilter = async () => {
    // Next.js App Router 방식: push 후 refresh로 서버 컴포넌트 재실행
    router.push('/dashboard/leads?dateRange=all')
    router.refresh()
  }

  return (
    <>
      {/* 상태 필터 알림 배너 (URL에서 status가 설정된 경우) */}
      {urlStatus && !selectedLeadId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <span className="text-emerald-600 text-lg">🔍</span>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-900">
                {STATUS_STYLES[urlStatus]?.label || urlStatus} 필터가 적용되었습니다 ({totalCount}건)
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

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* 첫 번째 행: 날짜 범위 (전체 너비) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 날짜 범위
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateRangeChange}
            placeholder="날짜 범위를 선택하세요"
          />
        </div>

        {/* 두 번째 행: 나머지 필터들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Landing Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              랜딩페이지 이름
            </label>
            <select
              value={landingPageId}
              onChange={(e) => setLandingPageId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PC/Mobile
            </label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pc">PC</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* Result */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              결과
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="new">상담 전</option>
              <option value="rejected">상담 거절</option>
              <option value="contacted">상담 진행중</option>
              <option value="converted">상담 완료</option>
              <option value="contract_completed">계약 완료</option>
              <option value="needs_followup">추가상담 필요</option>
              <option value="other">기타</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="이름, 전화번호 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFilterChange()
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleFilterChange}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 hover:text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleFilterChange}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            필터 적용
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  랜딩페이지 이름
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  PC/Mobile
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  전화번호
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 1
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 2
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  항목 3
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  결과
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  계약 완료
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!leads || leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-400">
                    데이터가 없습니다
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.landing_pages?.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.device_type?.toUpperCase() || 'PC'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.phone ? decryptPhone(lead.phone) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_1 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_2 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.custom_field_3 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="relative inline-block status-dropdown">
                        {/* 상태 배지 (클릭 가능) */}
                        <button
                          onClick={(e) => handleDropdownToggle(lead.id, e)}
                          disabled={updatingLeadId === lead.id}
                          className={`px-3 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full transition-all ${
                            STATUS_STYLES[lead.status]?.bg || 'bg-gray-100'
                          } ${STATUS_STYLES[lead.status]?.text || 'text-gray-800'} ${
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
                              {STATUS_STYLES[lead.status]?.label || getStatusLabel(lead.status)}
                              <ChevronDownIcon className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.contract_completed_at ? (
                        <div>
                          <div>
                            {new Date(lead.contract_completed_at).toISOString().split('T')[0]}
                          </div>
                          {lead.previous_contract_completed_at && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              이전: {new Date(lead.previous_contract_completed_at).toISOString().split('T')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
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
          {/* 위로 펼쳐질 때 취소 버튼을 먼저 표시 */}
          {dropdownPosition.openUpward && (
            <div className="border-b border-gray-100 mb-1 pb-1">
              <button
                onClick={() => {
                  setEditingLeadId(null)
                  setDropdownPosition(null)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          )}
          {STATUS_OPTIONS.map((option) => {
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
          {/* 아래로 펼쳐질 때 취소 버튼을 마지막에 표시 */}
          {!dropdownPosition.openUpward && (
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setEditingLeadId(null)
                  setDropdownPosition(null)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* 계약완료 날짜/시간 선택 모달 */}
      {contractModalLeadId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarDaysIcon className="h-6 w-6" />
                계약 완료 일정 등록
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
                      <div className="text-sm text-gray-500">{decryptPhone(lead.phone)}</div>
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
                    계약 완료
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
