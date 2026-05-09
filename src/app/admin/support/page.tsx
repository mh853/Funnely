'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Search,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
  company: {
    id: string
    name: string
    business_number: string
  }
  created_by: {
    id: string
    full_name: string
    email: string
  }
  assigned_admin: {
    id: string
    full_name: string
  } | null
  messages: { count: number }[]
}

interface Stats {
  total: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byCategory: Record<string, number>
  resolvedToday: number
  openTickets: number
}

const STATUS_LABELS: Record<string, string> = {
  open: '대기 중',
  in_progress: '처리 중',
  resolved: '해결됨',
  closed: '종료',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_BORDER: Record<string, string> = {
  open: 'border-l-amber-400',
  in_progress: 'border-l-blue-400',
  resolved: 'border-l-emerald-400',
  closed: 'border-l-gray-300',
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  open: Clock,
  in_progress: AlertCircle,
  resolved: CheckCircle,
  closed: XCircle,
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: '기술 문의',
  billing: '결제 문의',
  feature_request: '기능 요청',
  bug: '버그 신고',
  general: '일반 문의',
}

const FILTERS = [
  { key: 'all',         label: '전체' },
  { key: 'open',        label: '대기 중' },
  { key: 'in_progress', label: '처리 중' },
  { key: 'resolved',    label: '해결됨' },
  { key: 'closed',      label: '종료' },
]

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    fetchData()
  }, [filter, debouncedSearch, currentPage, perPage])

  async function fetchData() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        perPage: perPage.toString(),
      })
      if (filter !== 'all') params.append('status', filter)
      if (debouncedSearch) params.append('search', debouncedSearch)

      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/support/tickets?${params}`),
        fetch('/api/admin/support/stats'),
      ])

      if (ticketsRes.ok) {
        const d = await ticketsRes.json()
        setTickets(d.tickets || [])
        setTotalPages(d.pagination?.totalPages || 0)
        setTotalCount(d.pagination?.total || 0)
      }
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error fetching support data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-100 border-t-indigo-600" />
      </div>
    )
  }

  const done = stats ? (stats.byStatus.resolved || 0) + (stats.byStatus.closed || 0) : 0
  const undone = stats ? (stats.byStatus.open || 0) + (stats.byStatus.in_progress || 0) : 0
  const total = stats?.total || 1
  const donePct = Math.round((done / total) * 100)
  const undonePct = Math.round((undone / total) * 100)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100">
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Support</p>
        <h2 className="text-2xl font-bold text-white">문의 관리</h2>
        <p className="text-indigo-200 text-sm mt-1">고객 문의를 관리하고 답변합니다</p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {/* 전체 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">전체</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {stats.total.toLocaleString()}
                <span className="text-xs font-normal text-gray-400 ml-1">건</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          {/* 완료 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">완료</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {done.toLocaleString()}
                <span className="text-xs font-normal text-gray-400 ml-1">건</span>
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1.5">{donePct}%</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          {/* 미완료 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">미완료</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {undone.toLocaleString()}
                <span className="text-xs font-normal text-gray-400 ml-1">건</span>
              </p>
              <p className="text-xs text-amber-600 font-medium mt-1.5">{undonePct}%</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="회사명, 제목, 내용으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm border-gray-200 focus:ring-indigo-500"
          />
        </div>
        {debouncedSearch && (
          <p className="text-xs text-gray-400">검색 결과: {totalCount}개의 티켓</p>
        )}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setCurrentPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 티켓 목록 */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-600 mx-auto" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            티켓이 없습니다
          </div>
        ) : (
          tickets.map((ticket) => {
            const Icon = STATUS_ICONS[ticket.status]
            const messageCount = ticket.messages?.[0]?.count || 0

            return (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
                <div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${STATUS_BORDER[ticket.status]} hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{ticket.subject}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[ticket.status]}`}>
                            <Icon className="h-3 w-3" />
                            {STATUS_LABELS[ticket.status]}
                          </span>
                          <span className="text-xs text-gray-400">{CATEGORY_LABELS[ticket.category]}</span>
                          <span className={`text-xs font-semibold ${PRIORITY_COLORS[ticket.priority]}`}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          <span className="font-medium text-gray-700">{ticket.company.name}</span>
                          <span className="mx-1.5 text-gray-300">·</span>
                          {ticket.created_by.full_name}
                          <span className="mx-1.5 text-gray-300">·</span>
                          {format(new Date(ticket.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare className="h-3 w-3" />
                          {messageCount}
                        </div>
                        {ticket.assigned_admin && (
                          <p className="text-xs text-indigo-600 font-medium">{ticket.assigned_admin.full_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* 페이지네이션 */}
      {!loading && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="mt-6"
        />
      )}
    </div>
  )
}
