'use client'

import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  PhoneIcon,
  PencilIcon,
  PlusIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'
import ScheduleRegistrationModal from './ScheduleRegistrationModal'

interface TeamMember {
  id: string
  full_name: string
}

interface LeadData {
  id: string
  name: string
  phone: string | null
  created_at: string
  status: string
  contract_completed_at: string | null
  call_assigned_to: string | null
  counselor_assigned_to: string | null
  call_assigned_user?: { id: string; full_name: string } | null
  counselor_assigned_user?: { id: string; full_name: string } | null
  landing_pages?: {
    id: string
    title: string
    slug: string
  } | null
  device?: string | null
  consultation_items?: string[] | null
  custom_fields?: Array<{ label: string; value: string }> | null
  message?: string | null
  payment_amount?: number | null
  notes?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  referrer?: string | null
}

interface UnifiedDetailModalProps {
  isOpen: boolean
  onClose: () => void
  lead: LeadData | null
  teamMembers: TeamMember[]
  statusOptions: Array<{ value: string; label: string }>
  statusStyles: { [key: string]: { bg: string; text: string; label: string } }
  onUpdate?: () => void
}

export default function UnifiedDetailModal({
  isOpen,
  onClose,
  lead,
  teamMembers,
  statusOptions,
  statusStyles,
  onUpdate,
}: UnifiedDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 담당자 상태
  const [callAssignedTo, setCallAssignedTo] = useState<string>('')
  const [counselorAssignedTo, setCounselorAssignedTo] = useState<string>('')
  const [updatingCallAssignee, setUpdatingCallAssignee] = useState(false)
  const [updatingCounselor, setUpdatingCounselor] = useState(false)

  // 상태 변경
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // 예약완료일정등록 모달
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [reservationDate, setReservationDate] = useState<string | null>(null)

  // 결제 관리
  const [payments, setPayments] = useState<any[]>([])
  const [paymentsTotalAmount, setPaymentsTotalAmount] = useState(0)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentNotes, setNewPaymentNotes] = useState('')
  const [addingPayment, setAddingPayment] = useState(false)

  // 변경이력
  const [changeLogs, setChangeLogs] = useState<any[]>([])
  const [loadingChangeLogs, setLoadingChangeLogs] = useState(false)

  // lead가 변경될 때마다 상태 초기화
  useEffect(() => {
    if (lead) {
      setCallAssignedTo(lead.call_assigned_to || '')
      setCounselorAssignedTo(lead.counselor_assigned_to || '')
      setCurrentStatus(lead.status)
      setReservationDate(lead.contract_completed_at)
      setError(null)

      // 결제 내역 및 변경이력 조회
      fetchPayments(lead.id)
      fetchChangeLogs(lead.id)
    }
  }, [lead])

  // 결제 내역 조회
  const fetchPayments = async (leadId: string) => {
    setLoadingPayments(true)
    try {
      const response = await fetch(`/api/leads/payments?lead_id=${leadId}`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.data?.payments || [])
        setPaymentsTotalAmount(data.data?.totalAmount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  // 변경이력 조회
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

  // 콜 담당자 변경
  const handleCallAssigneeChange = async (newAssigneeId: string) => {
    if (!lead) return

    setUpdatingCallAssignee(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          call_assigned_to: newAssigneeId || null,
        }),
      })

      if (!response.ok) throw new Error('콜 담당자 업데이트 실패')

      setCallAssignedTo(newAssigneeId)
      fetchChangeLogs(lead.id)
      onUpdate?.()
    } catch (error) {
      console.error('Call assignee update error:', error)
      setError('콜 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCallAssignee(false)
    }
  }

  // 상담 담당자 변경
  const handleCounselorChange = async (newCounselorId: string) => {
    if (!lead) return

    setUpdatingCounselor(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          counselor_assigned_to: newCounselorId || null,
        }),
      })

      if (!response.ok) throw new Error('상담 담당자 업데이트 실패')

      setCounselorAssignedTo(newCounselorId)
      fetchChangeLogs(lead.id)
      onUpdate?.()
    } catch (error) {
      console.error('Counselor update error:', error)
      setError('상담 담당자 변경에 실패했습니다.')
    } finally {
      setUpdatingCounselor(false)
    }
  }

  // 상태 변경
  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return

    // 예약 확정 선택 시 모달 열기
    if (newStatus === 'contract_completed') {
      setShowScheduleModal(true)
      return
    }

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          status: newStatus,
        }),
      })

      if (!response.ok) throw new Error('상태 업데이트 실패')

      setCurrentStatus(newStatus)
      fetchChangeLogs(lead.id)
      onUpdate?.()
    } catch (error) {
      console.error('Status update error:', error)
      setError('상태 변경에 실패했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 예약 확정 처리
  const handleScheduleConfirm = async (date: string, time: string) => {
    if (!lead) return

    setUpdatingStatus(true)
    try {
      const contractCompletedAt = new Date(`${date}T${time}:00`).toISOString()

      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          status: 'contract_completed',
          contract_completed_at: contractCompletedAt,
        }),
      })

      if (!response.ok) throw new Error('예약 확정 실패')

      setCurrentStatus('contract_completed')
      setReservationDate(contractCompletedAt) // 즉시 업데이트
      setShowScheduleModal(false)
      fetchChangeLogs(lead.id)
      onUpdate?.()
    } catch (error) {
      console.error('Schedule confirm error:', error)
      setError('예약 확정에 실패했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 예약 취소 처리
  const handleCancelReservation = async () => {
    if (!lead) return

    if (!confirm('예약을 취소하시겠습니까?')) return

    setUpdatingStatus(true)
    try {
      const response = await fetch('/api/leads/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          status: 'needs_followup',
          contract_completed_at: null,
          cancel_reason: '예약취소(추가상담 필요)',
        }),
      })

      if (!response.ok) throw new Error('예약 취소 실패')

      setCurrentStatus('needs_followup')
      setReservationDate(null) // 즉시 업데이트
      fetchChangeLogs(lead.id)
      onUpdate?.()
    } catch (error) {
      console.error('Cancel reservation error:', error)
      setError('예약 취소에 실패했습니다.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 결제 내역 추가
  const handleAddPayment = async () => {
    if (!lead || !newPaymentAmount) return

    setAddingPayment(true)
    try {
      const amountValue = Number(newPaymentAmount.replace(/,/g, ''))
      const response = await fetch('/api/leads/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          amount: amountValue,
          notes: newPaymentNotes || null,
        }),
      })

      if (!response.ok) throw new Error('결제 내역 추가 실패')

      const data = await response.json()
      setPayments((prev) => [data.data.payment, ...prev])
      setPaymentsTotalAmount(data.data.totalAmount)
      setNewPaymentAmount('')
      setNewPaymentNotes('')
      onUpdate?.()
    } catch (error) {
      console.error('Add payment error:', error)
      setError('결제 내역 추가에 실패했습니다.')
    } finally {
      setAddingPayment(false)
    }
  }

  // 결제 내역 삭제
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('이 결제 내역을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/leads/payments?id=${paymentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('결제 내역 삭제 실패')

      const data = await response.json()
      setPayments((prev) => prev.filter((p) => p.id !== paymentId))
      setPaymentsTotalAmount(data.data.totalAmount)
      onUpdate?.()
    } catch (error) {
      console.error('Delete payment error:', error)
      setError('결제 내역 삭제에 실패했습니다.')
    }
  }

  // 필드 타입 라벨
  const getFieldTypeLabel = (fieldType: string) => {
    const labels: Record<string, string> = {
      status: '결과',
      call_assigned_to: '콜 담당자',
      counselor_assigned_to: '상담 담당자',
      notes: '비고',
      contract_completed_at: '예약일',
    }
    return labels[fieldType] || fieldType
  }

  // 변경 값 표시
  const getDisplayValue = (fieldType: string, value: string | null) => {
    if (!value) return '미지정'

    if (fieldType === 'call_assigned_to' || fieldType === 'counselor_assigned_to') {
      const member = teamMembers.find((m) => m.id === value)
      return member?.full_name || '알 수 없음'
    }

    if (fieldType === 'status') {
      const status = statusOptions.find((s) => s.value === value)
      return status?.label || value
    }

    if (fieldType === 'contract_completed_at') {
      return new Date(value).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return value
  }

  if (!lead) return null

  const currentStatusStyle = statusStyles[currentStatus] || statusStyles.new
  const landingPageUrl = lead.landing_pages
    ? `https://funnely.co.kr/landing/${lead.landing_pages.slug}`
    : null

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <Dialog.Panel className="w-[1024px] h-[92vh] transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all flex flex-col">
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <Dialog.Title as="h3" className="text-lg font-bold">
                        DB 관리
                      </Dialog.Title>
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* 담당자 선택 */}
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-center gap-4">
                    {/* 콜 담당자 */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">콜담당자</label>
                      <select
                        value={callAssignedTo}
                        onChange={(e) => handleCallAssigneeChange(e.target.value)}
                        disabled={updatingCallAssignee}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">미지정</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 상담 담당자 */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">상담 담당자</label>
                      <select
                        value={counselorAssignedTo}
                        onChange={(e) => handleCounselorChange(e.target.value)}
                        disabled={updatingCounselor}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="">미지정</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {/* 2열 레이아웃 */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 flex-1 min-h-0">
                    {/* 왼쪽 열 (60%) */}
                    <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
                      {/* DB 신청 내용 */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                        <h3 className="text-base font-bold text-gray-900 mb-2">DB 신청 내용</h3>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">이름</dt>
                            <dd className="mt-0.5 text-sm text-gray-900 font-medium">{lead.name}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500 flex items-center gap-1">
                              <PhoneIcon className="h-4 w-4" />
                              전화번호
                            </dt>
                            <dd className="mt-0.5">
                              {lead.phone ? (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  {lead.phone}
                                </a>
                              ) : (
                                <span className="text-sm text-gray-400">정보 없음</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">DB 신청일</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">
                              {formatDateTime(lead.created_at)}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* DB 신청 상세내용 */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-3 flex-1 flex flex-col min-h-0">
                        <h3 className="text-base font-bold text-gray-900 mb-2">DB 신청 상세내용</h3>
                        <dl className="space-y-2 flex-1 overflow-y-auto">
                          {lead.landing_pages && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">랜딩페이지</dt>
                              <dd className="mt-0.5">
                                {landingPageUrl ? (
                                  <a
                                    href={landingPageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                  >
                                    {lead.landing_pages.title}
                                  </a>
                                ) : (
                                  <span className="text-sm text-gray-900">
                                    {lead.landing_pages.title}
                                  </span>
                                )}
                              </dd>
                            </div>
                          )}
                          {lead.device && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">기기</dt>
                              <dd className="mt-0.5 text-sm text-gray-900">{lead.device}</dd>
                            </div>
                          )}

                          {/* 결과 및 예약일 통합 필드 */}
                          <div className="pt-2 border-t border-gray-100">
                            <dt className="text-sm font-medium text-gray-700 mb-2">결과 및 예약일</dt>
                            <dd className="space-y-2">
                              {/* 결과 (상태) */}
                              <div>
                                <span className="text-xs font-medium text-gray-500 block mb-1">결과</span>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => handleStatusChange(e.target.value)}
                                  disabled={updatingStatus}
                                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 ${currentStatusStyle.bg} ${currentStatusStyle.text}`}
                                >
                                  {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* 예약일 */}
                              <div>
                                <span className="text-xs font-medium text-gray-500 block mb-1">예약일</span>
                                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                  {reservationDate ? (
                                    <>
                                      <span className="text-sm text-gray-900 font-medium">
                                        {new Date(reservationDate).toLocaleDateString('ko-KR', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => setShowScheduleModal(true)}
                                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition"
                                          title="예약 변경"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={handleCancelReservation}
                                          disabled={updatingStatus}
                                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition disabled:opacity-50"
                                          title="예약 취소"
                                        >
                                          <XMarkIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm text-gray-400">예약일 미설정</span>
                                      <button
                                        onClick={() => setShowScheduleModal(true)}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition"
                                        title="예약 설정"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </dd>
                          </div>

                          {lead.consultation_items && lead.consultation_items.length > 0 && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500 mb-1">선택항목</dt>
                              <dd className="flex flex-wrap gap-2">
                                {lead.consultation_items.map((item, index) => (
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
                          {lead.custom_fields && lead.custom_fields.length > 0 && (
                            <div className="space-y-1.5">
                              {lead.custom_fields.map((field, index) => (
                                <div key={index}>
                                  <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                                  <dd className="mt-0.5 text-sm text-gray-900">{field.value}</dd>
                                </div>
                              ))}
                            </div>
                          )}
                          {lead.message && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">뭐가 궁금하신가요</dt>
                              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-wrap">
                                {lead.message}
                              </dd>
                            </div>
                          )}
                          {lead.notes && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">비고</dt>
                              <dd className="mt-0.5 text-sm text-gray-900 whitespace-pre-wrap">
                                {lead.notes}
                              </dd>
                            </div>
                          )}

                          {/* UTM 파라미터 섹션 */}
                          {(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_content || lead.utm_term) && (
                            <div className="pt-2 border-t border-gray-100">
                              <dt className="text-sm font-medium text-gray-700 mb-1">유입 경로 (UTM)</dt>
                              <dd className="space-y-1">
                                {lead.utm_source && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">Source:</span>
                                    <span className="text-xs text-gray-900">{lead.utm_source}</span>
                                  </div>
                                )}
                                {lead.utm_medium && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">Medium:</span>
                                    <span className="text-xs text-gray-900">{lead.utm_medium}</span>
                                  </div>
                                )}
                                {lead.utm_campaign && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">Campaign:</span>
                                    <span className="text-xs text-gray-900">{lead.utm_campaign}</span>
                                  </div>
                                )}
                                {lead.utm_content && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">Content:</span>
                                    <span className="text-xs text-gray-900">{lead.utm_content}</span>
                                  </div>
                                )}
                                {lead.utm_term && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">Term:</span>
                                    <span className="text-xs text-gray-900">{lead.utm_term}</span>
                                  </div>
                                )}
                              </dd>
                            </div>
                          )}

                        </dl>
                      </div>
                    </div>

                    {/* 오른쪽 열 (40%) */}
                    <div className="lg:col-span-2 flex flex-col gap-3 min-h-0 overflow-y-auto">
                      {/* 결제금액 */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                        <h3 className="text-base font-bold text-gray-900 mb-2">결제금액</h3>

                        {loadingPayments ? (
                          <p className="text-sm text-gray-500">로딩 중...</p>
                        ) : (
                          <>
                            <div className="space-y-1 mb-2 max-h-[180px] overflow-y-auto">
                              {payments.map((payment) => (
                                <div
                                  key={payment.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {payment.amount?.toLocaleString()}원
                                    </p>
                                    {payment.payment_date && (
                                      <p className="text-xs text-gray-500">
                                        {new Date(payment.payment_date).toLocaleString('ko-KR', {
                                          year: 'numeric',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    )}
                                    {payment.notes && (
                                      <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    삭제
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* 결제 추가 폼 */}
                            <div className="space-y-1 mb-2">
                              <input
                                type="text"
                                value={newPaymentAmount}
                                onChange={(e) => setNewPaymentAmount(e.target.value)}
                                placeholder="금액"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <input
                                type="text"
                                value={newPaymentNotes}
                                onChange={(e) => setNewPaymentNotes(e.target.value)}
                                placeholder="비고 (선택)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <button
                                onClick={handleAddPayment}
                                disabled={addingPayment || !newPaymentAmount}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                <PlusIcon className="h-4 w-4" />
                                추가
                              </button>
                            </div>

                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">합계</span>
                                <span className="text-lg font-bold text-indigo-600">
                                  {paymentsTotalAmount.toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 변경이력 */}
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-3">
                        <h3 className="text-base font-bold text-gray-900 mb-2">변경이력</h3>

                        {loadingChangeLogs ? (
                          <p className="text-sm text-gray-500">로딩 중...</p>
                        ) : changeLogs.length === 0 ? (
                          <p className="text-sm text-gray-500">변경 이력이 없습니다.</p>
                        ) : (
                          <div className="space-y-2 max-h-[270px] overflow-y-auto">
                            {changeLogs.map((log) => (
                              <div
                                key={log.id}
                                className="p-2 bg-gray-50 rounded-lg border-l-4 border-indigo-500"
                              >
                                <p className="text-sm font-medium text-gray-900">
                                  {getFieldTypeLabel(log.field_type)}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {getDisplayValue(log.field_type, log.previous_value)} →{' '}
                                  {getDisplayValue(log.field_type, log.new_value)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(log.created_at).toLocaleString('ko-KR')}
                                  {log.changed_by_user && ` · ${log.changed_by_user.full_name}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* 예약완료일정등록 모달 */}
      {lead && (
        <ScheduleRegistrationModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          leadId={lead.id}
          onConfirm={handleScheduleConfirm}
        />
      )}
    </>
  )
}
