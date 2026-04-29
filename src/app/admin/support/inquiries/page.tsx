'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Building2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

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
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: '처리중', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  resolved: { label: '완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: '닫힘', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
}

const TYPE_CONFIG = {
  general: { label: '일반 문의', color: 'bg-blue-50 text-blue-700' },
  sales: { label: '영업 상담', color: 'bg-purple-50 text-purple-700' },
}

export default function AdminInquiriesPage() {
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
      await fetch('/admin/api/support/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      fetchInquiries()
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => prev ? { ...prev, status: status as Inquiry['status'] } : null)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const pending = inquiries.filter((i) => i.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/support" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">홈페이지 문의</h1>
            <p className="text-sm text-gray-500 mt-1">마케팅 홈페이지에서 접수된 문의 목록</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
              <Clock className="h-4 w-4" />
              미처리 {pending}건
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchInquiries} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체', value: total, color: 'text-gray-900' },
          { label: '대기중', value: inquiries.filter((i) => i.status === 'pending').length, color: 'text-yellow-600' },
          { label: '처리중', value: inquiries.filter((i) => i.status === 'in_progress').length, color: 'text-blue-600' },
          { label: '완료', value: inquiries.filter((i) => i.status === 'resolved').length, color: 'text-green-600' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* List */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="이름, 이메일, 제목 검색..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 유형</option>
                <option value="general">일반 문의</option>
                <option value="sales">영업 상담</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                로딩 중...
              </div>
            ) : inquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">접수된 문의가 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {inquiries.map((inquiry) => {
                  const statusCfg = STATUS_CONFIG[inquiry.status]
                  const typeCfg = TYPE_CONFIG[inquiry.inquiry_type]
                  const StatusIcon = statusCfg.icon
                  const isSelected = selectedInquiry?.id === inquiry.id

                  return (
                    <button
                      key={inquiry.id}
                      onClick={() => setSelectedInquiry(inquiry)}
                      className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeCfg.color}`}>
                              {typeCfg.label}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 truncate">{inquiry.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {inquiry.name} • {inquiry.email}
                          </p>
                        </div>
                        <time className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                          {format(new Date(inquiry.created_at), 'MM.dd HH:mm', { locale: ko })}
                        </time>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">총 {total}건</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    이전
                  </Button>
                  <span className="flex items-center px-2 text-sm text-gray-600">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    다음
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        {selectedInquiry ? (
          <Card className="h-fit sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{selectedInquiry.subject}</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(selectedInquiry.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_CONFIG[selectedInquiry.inquiry_type].color}`}>
                  {TYPE_CONFIG[selectedInquiry.inquiry_type].label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact info */}
              <div className="rounded-xl bg-gray-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{selectedInquiry.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${selectedInquiry.email}`} className="hover:text-blue-600 transition-colors">
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${selectedInquiry.phone}`} className="hover:text-blue-600 transition-colors">
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

              {/* Message */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">문의 내용</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg border border-gray-100 p-3">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Status update */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">상태 변경</p>
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
                            ? `${cfg.color} border-current opacity-100`
                            : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50'
                        }`}
                      >
                        {isActive && '✓ '}{cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Reply shortcut */}
              <a
                href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Mail className="h-4 w-4" />
                이메일로 답장
              </a>
            </CardContent>
          </Card>
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
