'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { decryptPhone } from '@/lib/encryption/phone'
import {
  XMarkIcon,
  ChevronDownIcon,
  PhoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

interface LandingPage {
  id: string
  title: string
  slug: string
}

interface Lead {
  id: string
  name: string
  phone: string | null
  status: string
  contract_completed_at: string | null
  previous_contract_completed_at?: string | null
  landing_pages: LandingPage | LandingPage[] | null
}

interface ReservationsClientProps {
  initialLeads: Lead[]
  companyId: string
}

// 상태별 스타일 정의 (모달 테이블용)
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

export default function ReservationsClient({
  initialLeads,
  companyId,
}: ReservationsClientProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const supabase = createClient()

  // Lead detail modal state
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadDetails, setLeadDetails] = useState<any>(null)
  const [loadingLeadDetails, setLoadingLeadDetails] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // All leads modal state (날짜별 전체 리스트)
  const [showAllLeadsModal, setShowAllLeadsModal] = useState(false)

  // Date leads modal state (특정 날짜 리스트)
  const [showDateLeadsModal, setShowDateLeadsModal] = useState(false)
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null)

  // Calendar modal state (캘린더 뷰 모달)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date())

  // 디버깅용 로그
  console.log('ReservationsClient initialLeads:', initialLeads)
  console.log('ReservationsClient leads state:', leads)

  // Handle lead click - open lead detail modal
  const handleLeadClick = async (lead: Lead) => {
    setSelectedLead(lead)
    setShowLeadDetailModal(true)
    setLoadingLeadDetails(true)

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          landing_pages (
            id,
            title,
            slug
          )
        `)
        .eq('id', lead.id)
        .single()

      if (error) throw error
      setLeadDetails(data)
    } catch (error) {
      console.error('Error fetching lead details:', error)
    } finally {
      setLoadingLeadDetails(false)
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

  // Handle calendar date click
  const handleCalendarDateClick = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (leadsByDate[dateStr] && leadsByDate[dateStr].length > 0) {
      setShowCalendarModal(false)
      setSelectedDateForModal(dateStr)
      setShowDateLeadsModal(true)
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

      // Update local state (기존 날짜를 previous로 이동)
      const updatedData = {
        status: newStatus,
        ...(newStatus === 'contract_completed' && {
          previous_contract_completed_at: leadDetails.contract_completed_at || null,
          contract_completed_at: new Date().toISOString()
        })
      }
      setLeadDetails({ ...leadDetails, ...updatedData })
      setLeads(leads.map(l =>
        l.id === selectedLead.id ? { ...l, ...updatedData } : l
      ))
      setEditingStatus(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">예약 스케줄</h1>
            <p className="mt-2 text-emerald-100">
              계약 완료된 예약 일정을 관리합니다
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{leads.length}</div>
            <div className="text-sm text-emerald-100">총 예약 건수</div>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {sortedDates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">예약된 일정이 없습니다</div>
            <p className="text-sm text-gray-500">
              계약 완료 시 날짜/시간을 지정하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
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
                <div key={date} className="p-6 hover:bg-gray-50 transition-colors">
                  {/* Date Header - Clickable */}
                  <div
                    className="flex items-center gap-3 mb-4 cursor-pointer group"
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {dateObj.getDate()}
                        </div>
                        <div className="text-xs text-emerald-600">
                          {dateObj.toLocaleDateString('ko-KR', { month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {formattedDate}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {dateLeads.length}건의 예약 <span className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">• 클릭하여 전체 보기</span>
                      </p>
                    </div>
                  </div>

                  {/* Reservation Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-0 md:ml-20">
                    {dateLeads.map((lead) => {
                      const time = new Date(lead.contract_completed_at!).toLocaleTimeString(
                        'ko-KR',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                      const phone = lead.phone ? decryptPhone(lead.phone) : null
                      // landing_pages가 배열일 수도 있고 객체일 수도 있음
                      const landingPage = Array.isArray(lead.landing_pages)
                        ? lead.landing_pages[0]
                        : lead.landing_pages

                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleLeadClick(lead)}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          {/* Time Badge */}
                          <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            {time}
                          </div>

                          {/* Lead Info */}
                          <div className="space-y-2">
                            <div className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {lead.name}
                            </div>

                            {landingPage?.title && (
                              <div className="text-xs text-gray-500">
                                {landingPage.title}
                              </div>
                            )}

                            {/* Contact Info - Shows on Hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {phone && (
                                <div className="text-sm text-emerald-600 font-medium">
                                  {phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hover Indicator */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-5 h-5 text-emerald-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
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

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setShowAllLeadsModal(true)}
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-emerald-600 bg-white border-2 border-emerald-600 rounded-full hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          모든 계약 완료 건 보기
        </button>
        <button
          onClick={() => setShowCalendarModal(true)}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <CalendarDaysIcon className="h-5 w-5" />
          캘린더 뷰로 보기
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
                  <p className="text-sm text-emerald-100">계약 완료 고객 정보</p>
                </div>
                <button
                  onClick={() => {
                    setShowLeadDetailModal(false)
                    setSelectedLead(null)
                    setLeadDetails(null)
                    setEditingStatus(false)
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
                            {editingStatus ? (
                              <div className="relative">
                                <select
                                  value={leadDetails.status}
                                  onChange={(e) => handleStatusUpdate(e.target.value)}
                                  disabled={updatingStatus}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                {updatingStatus && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                    STATUS_STYLES[leadDetails.status]?.bg || 'bg-gray-100'
                                  } ${STATUS_STYLES[leadDetails.status]?.text || 'text-gray-800'}`}
                                >
                                  {STATUS_STYLES[leadDetails.status]?.label || leadDetails.status}
                                </span>
                                <button
                                  onClick={() => setEditingStatus(true)}
                                  className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                                >
                                  <ChevronDownIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {/* 희망 상담일 */}
                        {leadDetails.preferred_date && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">희망 상담일</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(leadDetails.preferred_date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
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
                            {new Date(leadDetails.created_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                        {/* 계약 완료일 */}
                        {leadDetails.contract_completed_at && (
                          <tr>
                            <td className="px-4 py-3 bg-gray-100 text-sm font-medium text-gray-700">계약 완료일</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div>
                                {new Date(leadDetails.contract_completed_at).toISOString().split('T')[0]}
                              </div>
                              {leadDetails.previous_contract_completed_at && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  이전: {new Date(leadDetails.previous_contract_completed_at).toISOString().split('T')[0]}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                            const time = new Date(lead.contract_completed_at!).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
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
                    const time = new Date(lead.contract_completed_at!).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
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
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
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
                          if (day && leadCount > 0) {
                            handleCalendarDateClick(
                              calendarCurrentMonth.getFullYear(),
                              calendarCurrentMonth.getMonth(),
                              day
                            )
                          }
                        }}
                        className={`
                          min-h-[80px] p-2 border-t border-l border-gray-100
                          ${day && leadCount > 0 ? 'cursor-pointer hover:bg-emerald-50' : ''}
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
                  <div className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">N건</div>
                  <span>계약 완료 건수</span>
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
    </div>
  )
}
