'use client'

import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useToast } from '@/components/shared/Toast'

type Inquiry = {
  id: string
  inquiry_type: 'general' | 'sales'
  name: string
  email: string
  phone: string | null
  company: string | null
  subject: string
  message: string
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
}

const STATUS_CONFIG = {
  pending:     { label: '대기중', badge: 'bg-amber-100 text-amber-700',   border: 'border-l-amber-400',   icon: Clock },
  in_progress: { label: '처리중', badge: 'bg-blue-100 text-blue-700',     border: 'border-l-blue-400',    icon: RefreshCw },
  resolved:    { label: '완료',   badge: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400', icon: CheckCircle },
  closed:      { label: '닫힘',   badge: 'bg-gray-100 text-gray-600',     border: 'border-l-gray-300',    icon: AlertCircle },
}

const TYPE_CONFIG = {
  general:   { label: '일반 문의', color: 'bg-indigo-50 text-indigo-700' },
  sales:     { label: '영업 상담', color: 'bg-purple-50 text-purple-700' },
  technical: { label: '기술 문의', color: 'bg-sky-50 text-sky-700' },
  billing:   { label: '결제 문의', color: 'bg-amber-50 text-amber-700' },
}

export default function AdminInquiriesPage() {
  const toast = useToast()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchInquiries = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { inquiry_type: typeFilter }),
      })
      const res = await fetch(`/admin/api/support/inquiries?${params}`)
      const data = await res.json()
      setInquiries(data.inquiries || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, statusFilter, typeFilter])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const updateStatus = async (id: string, status: string) => {
    setIsUpdating(true)
    try {
      const res = await fetch('/admin/api/support/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      fetchInquiries()
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => prev ? { ...prev, status: status as Inquiry['status'] } : null)
      }
    } catch (err) {
      console.error(err)
      toast.error('상태 변경에 실패했습니다')
    } finally {
      setIsUpdating(false)
    }
  }

  const pending = inquiries.filter((i) => i.status === 'pending').length
  const inProgress = inquiries.filter((i) => i.status === 'in_progress').length
  const resolved = inquiries.filter((i) => i.status === 'resolved').length

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100 flex items-end justify-between">
        <div>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Inquiries</p>
          <h2 className="text-2xl font-bold text-white">홈페이지 문의</h2>
          <p className="text-indigo-200 text-sm mt-1">마케팅 홈페이지에서 접수된 문의 목록</p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-lg border border-white/30">
            <Clock className="h-4 w-4" />
            미처리 {pending}건
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체',   value: total,      icon: MessageSquare, color: 'text-indigo-500',  bg: 'bg-indigo-50' },
          { label: '대기중', value: pending,     icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50' },
          { label: '처리중', value: inProgress,  icon: RefreshCw,     color: 'text-blue-500',    bg: 'bg-blue-50' },
          { label: '완료',   value: resolved,    icon: CheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {value.toLocaleString()}
                <span className="text-xs font-normal text-gray-400 ml-1">건</span>
              </p>
            </div>
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* 목록 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 검색/필터 */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름, 이메일, 제목 검색..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9 border-gray-200 focus:ring-indigo-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="in_progress">처리중</option>
                <option value="resolved">완료</option>
                <option value="closed">닫힘</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체 유형</option>
                <option value="general">일반 문의</option>
                <option value="sales">영업 상담</option>
              </select>
              <button
                onClick={fetchInquiries}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-600" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">접수된 문의가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {inquiries.map((inquiry) => {
                const statusCfg = STATUS_CONFIG[inquiry.status]
                const typeCfg = TYPE_CONFIG[inquiry.inquiry_type]
                const StatusIcon = statusCfg.icon
                const isSelected = selectedInquiry?.id === inquiry.id

                return (
                  <button
                    key={inquiry.id}
                    onClick={() => setSelectedInquiry(inquiry)}
                    className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors border-l-4 ${
                      isSelected ? 'bg-indigo-50 border-l-indigo-500' : `${statusCfg.border} bg-white`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.badge}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate">{inquiry.subject}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {inquiry.name}
                          <span className="mx-1.5 text-gray-300">·</span>
                          {inquiry.email}
                        </p>
                      </div>
                      <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                        {format(new Date(inquiry.created_at), 'MM-dd HH:mm', { locale: ko })}
                      </time>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">총 {total}건</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        {selectedInquiry ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit sticky top-6">
            {/* 패널 헤더 */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-5 pt-5 pb-8">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-indigo-200 text-[10px] font-semibold uppercase tracking-widest mb-1">
                    {TYPE_CONFIG[selectedInquiry.inquiry_type].label}
                  </p>
                  <h3 className="text-white font-bold text-base leading-snug">{selectedInquiry.subject}</h3>
                  <p className="text-indigo-200 text-xs mt-1">
                    {format(new Date(selectedInquiry.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${STATUS_CONFIG[selectedInquiry.status].badge}`}>
                  {STATUS_CONFIG[selectedInquiry.status].label}
                </span>
              </div>
            </div>

            <div className="px-5 -mt-3 pb-5 space-y-4">
              {/* 연락처 카드 */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-900">{selectedInquiry.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${selectedInquiry.email}`} className="hover:text-indigo-600 transition-colors truncate">
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${selectedInquiry.phone}`} className="hover:text-indigo-600 transition-colors">
                      {selectedInquiry.phone}
                    </a>
                  </div>
                )}
                {selectedInquiry.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{selectedInquiry.company}</span>
                  </div>
                )}
              </div>

              {/* 문의 내용 */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">문의 내용</p>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl border border-gray-100 p-4">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* 상태 변경 */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">상태 변경</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['pending', 'in_progress', 'resolved', 'closed'] as const).map((status) => {
                    const cfg = STATUS_CONFIG[status]
                    const isActive = selectedInquiry.status === status
                    return (
                      <button
                        key={status}
                        onClick={() => updateStatus(selectedInquiry.id, status)}
                        disabled={isActive || isUpdating}
                        className={`rounded-lg py-2 px-3 text-xs font-medium transition-all border ${
                          isActive
                            ? `${cfg.badge} border-current`
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                        }`}
                      >
                        {isActive && '✓ '}{cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 이메일 답장 */}
              <a
                href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-blue-600 transition-all shadow-sm shadow-indigo-200"
              >
                <Mail className="h-4 w-4" />
                이메일로 답장
              </a>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 h-64">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">문의를 선택하면 상세 내용이 표시됩니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
