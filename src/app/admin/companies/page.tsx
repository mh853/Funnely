'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Download, Building2, Calendar, User, CreditCard, TrendingUp, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Company {
  id: string
  name: string
  is_active: boolean
  created_at: string
  withdrawn_at: string | null
  admin_user: { id: string; full_name: string; email: string } | null
  stats: { total_users: number }
  subscription: {
    plan_name: string | null
    monthly_price: number
    yearly_price: number
    billing_cycle: string
    status: string
    trial_end_date: string | null
    current_period_end: string | null
    subscribed_at: string | null
    canceled_at: string | null
  } | null
  payment_stats: {
    total_paid: number
    payment_count: number
    first_payment_date: string | null
    last_payment_date: string | null
  }
}

interface PaymentRow {
  sequence: number
  date: string
  planName: string
  amount: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type SortColumn =
  | 'name'
  | 'stats.total_users'
  | 'subscription.status'
  | 'subscription.monthly_price'
  | 'payment_stats.payment_count'
  | 'payment_stats.total_paid'
  | 'payment_stats.first_payment_date'
  | 'payment_stats.last_payment_date'
  | 'is_active'
  | 'created_at'
  | 'withdrawn_at'

function fmtDate(d: string | null, f = 'yyyy.MM.dd') {
  if (!d) return '-'
  try { return format(new Date(d), f, { locale: ko }) } catch { return '-' }
}

// ─── Company Detail Modal ──────────────────────────────────────────────────────

function CompanyModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const sub = company.subscription
  const pm = company.payment_stats

  useEffect(() => {
    fetch(`/api/admin/companies/${company.id}/payments`)
      .then((r) => r.json())
      .then((d) => setPayments(d.payments || []))
      .catch(console.error)
      .finally(() => setLoadingPayments(false))
  }, [company.id])

  const statusLabel =
    company.withdrawn_at ? '탈퇴'
    : company.is_active ? '활성'
    : '비활성'

  const statusColor =
    company.withdrawn_at ? 'bg-red-100 text-red-700'
    : company.is_active ? 'bg-emerald-100 text-emerald-700'
    : 'bg-gray-100 text-gray-500'

  const subStatusLabel =
    sub?.status === 'active' ? '활성'
    : sub?.status === 'trial' ? '체험중'
    : sub?.status === 'past_due' ? '결제지연'
    : sub?.status === 'canceled' ? '취소됨'
    : '-'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Header bar – indigo gradient */}
        <div className="relative bg-gradient-to-r from-indigo-600 to-blue-500 px-7 pt-6 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{company.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                  {statusLabel}
                </span>
                {sub && (
                  <span className="text-white/70 text-xs">
                    {sub.plan_name} · {subStatusLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 -mt-3">

          {/* Info card floating over header */}
          <div className="mx-6 bg-white rounded-xl shadow-md border border-gray-100 px-6 pt-7 pb-5 mb-1">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field icon={<Building2 className="w-3.5 h-3.5" />} label="회사명" value={company.name} />
              <Field icon={<Calendar className="w-3.5 h-3.5" />} label="회원가입일" value={fmtDate(company.created_at)} />
              <Field icon={<User className="w-3.5 h-3.5" />} label="담당자" value={company.admin_user?.full_name || '-'} />
              <Field icon={<User className="w-3.5 h-3.5" />} label="사용자" value={`${company.stats.total_users}명`} />
              <Field
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="무료체험"
                value={sub?.trial_end_date ? `~ ${fmtDate(sub.trial_end_date)}` : '-'}
              />
              <Field icon={<Calendar className="w-3.5 h-3.5" />} label="다음 결제일" value={fmtDate(sub?.current_period_end || null)} />
              <Field icon={<Calendar className="w-3.5 h-3.5" />} label="최초 결제일" value={fmtDate(pm.first_payment_date)} />
              <Field icon={<LogOut className="w-3.5 h-3.5" />} label="탈퇴일" value={fmtDate(company.withdrawn_at)} />
              <Field icon={<CreditCard className="w-3.5 h-3.5" />} label="구독플랜" value={sub?.plan_name || '-'} />
              <Field
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="누적 결제금액"
                value={`${pm.total_paid.toLocaleString()}원`}
                highlight
              />
            </div>
          </div>

          {/* Payment history */}
          <div className="mx-6 mb-6 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                결제 내역
              </h3>
              <span className="text-xs text-gray-400">총 {pm.payment_count}회</span>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-20">결제회차</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">날짜</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">구독플랜</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">결제금액(원)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                        결제 내역이 없습니다
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.sequence} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-indigo-50 text-indigo-700 text-xs font-bold">
                            {p.sequence}차
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{fmtDate(p.date, 'yyyy.MM.dd')}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs font-medium">{p.planName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-7 py-4 flex justify-end bg-gray-50/80">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
        {icon && <span className="text-gray-300">{icon}</span>}
        {label}
      </dt>
      <dd className={`text-sm font-semibold ${highlight ? 'text-indigo-600' : 'text-gray-800'}`}>
        {value}
      </dd>
    </div>
  )
}

// ─── Sort helpers ──────────────────────────────────────────────────────────────

function SortButton({
  column, current, order, onClick,
}: {
  column: SortColumn; current: SortColumn; order: 'asc' | 'desc'
  onClick: (col: SortColumn) => void
}) {
  const active = current === column
  return (
    <button
      className="inline-flex flex-col -space-y-1 ml-1 opacity-50 hover:opacity-100"
      onClick={(e) => { e.stopPropagation(); onClick(column) }}
    >
      <ChevronUp className={`w-3 h-3 ${active && order === 'asc' ? 'text-indigo-600 opacity-100' : ''}`} />
      <ChevronDown className={`w-3 h-3 ${active && order === 'desc' ? 'text-indigo-600 opacity-100' : ''}`} />
    </button>
  )
}

function Th({
  label, col, sortBy, sortOrder, onSort, align = 'left',
}: {
  label: string; col: SortColumn; sortBy: SortColumn; sortOrder: 'asc' | 'desc'
  onSort: (col: SortColumn) => void; align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortButton column={col} current={sortBy} order={sortOrder} onClick={onSort} />
      </span>
    </th>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [rawCompanies, setRawCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortColumn>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  const DB_SORT_COLS: SortColumn[] = ['name', 'created_at', 'withdrawn_at']

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true)
      const apiSortBy = DB_SORT_COLS.includes(sortBy) ? sortBy : 'created_at'
      const apiSortOrder = DB_SORT_COLS.includes(sortBy) ? sortOrder : 'desc'
      const params = new URLSearchParams({ search, status, page: page.toString(), limit: '20', sortBy: apiSortBy, sortOrder: apiSortOrder })
      const res = await fetch(`/api/admin/companies?${params}`)
      if (!res.ok) throw new Error('Failed')
      const result = await res.json()
      setRawCompanies(result.companies || [])
      setPagination(result.pagination || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page, DB_SORT_COLS.includes(sortBy) ? sortBy : '__', DB_SORT_COLS.includes(sortBy) ? sortOrder : '__'])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  useEffect(() => {
    if (DB_SORT_COLS.includes(sortBy)) { setCompanies(rawCompanies); return }
    const sorted = [...rawCompanies].sort((a, b) => {
      let av: any = 0, bv: any = 0
      if (sortBy === 'stats.total_users')              { av = a.stats.total_users;                   bv = b.stats.total_users }
      else if (sortBy === 'subscription.status')       { av = a.subscription?.status || '';           bv = b.subscription?.status || '' }
      else if (sortBy === 'subscription.monthly_price'){ av = a.subscription?.monthly_price || 0;    bv = b.subscription?.monthly_price || 0 }
      else if (sortBy === 'payment_stats.payment_count'){ av = a.payment_stats.payment_count;        bv = b.payment_stats.payment_count }
      else if (sortBy === 'payment_stats.total_paid')  { av = a.payment_stats.total_paid;            bv = b.payment_stats.total_paid }
      else if (sortBy === 'payment_stats.first_payment_date') { av = a.payment_stats.first_payment_date || ''; bv = b.payment_stats.first_payment_date || '' }
      else if (sortBy === 'payment_stats.last_payment_date')  { av = a.payment_stats.last_payment_date || '';  bv = b.payment_stats.last_payment_date || '' }
      else if (sortBy === 'is_active')                 { av = a.is_active ? 1 : 0;                   bv = b.is_active ? 1 : 0 }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1
      if (av > bv) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    setCompanies(sorted)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCompanies, sortBy, sortOrder])

  function handleSort(col: SortColumn) {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortOrder('desc') }
    if (DB_SORT_COLS.includes(col)) setPage(1)
  }

  function handleExportCSV() {
    const headers = ['회사명','담당자','이메일','사용자수','구독플랜','구독상태','월결제금액','결제회차','누적결제금액','최초결제일','마지막결제일','상태','가입일','탈퇴일']
    const rows = companies.map((c) => [
      c.name, c.admin_user?.full_name||'', c.admin_user?.email||'', c.stats.total_users,
      c.subscription?.plan_name||'', c.subscription?.status||'', c.subscription?.monthly_price||0,
      c.payment_stats.payment_count, c.payment_stats.total_paid,
      c.payment_stats.first_payment_date||'', c.payment_stats.last_payment_date||'',
      c.is_active?'활성':'비활성', c.created_at.split('T')[0], c.withdrawn_at?c.withdrawn_at.split('T')[0]:'',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `고객사_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusFilters = [
    { label: '전체', value: 'all' },
    { label: '활성', value: 'active' },
    { label: '비활성', value: 'inactive' },
    { label: '탈퇴', value: 'withdrawn' },
  ]

  function fmtDate(d: string | null) {
    if (!d) return '-'
    try { return format(new Date(d), 'yyyy-MM-dd', { locale: ko }) } catch { return '-' }
  }

  return (
    <div className="space-y-8">
      {selectedCompany && (
        <CompanyModal company={selectedCompany} onClose={() => setSelectedCompany(null)} />
      )}

      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100 flex items-end justify-between">
        <div>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Companies</p>
          <h2 className="text-2xl font-bold text-white">고객사 관리</h2>
          <p className="text-indigo-200 text-sm mt-1">전체 고객사 목록을 조회합니다</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors backdrop-blur-sm border border-white/30"
        >
          <Download className="h-4 w-4" />
          CSV 다운로드
        </button>
      </div>

      {/* 검색·필터 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="회사명 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatus(s.value); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                status === s.value
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-600 mx-auto" />
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">고객사가 없습니다</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <Th label="회사명"     col="name"                              sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">담당자</th>
                    <Th label="사용자"     col="stats.total_users"                 sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">구독플랜</th>
                    <Th label="구독상태"   col="subscription.status"               sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <Th label="월결제금액" col="subscription.monthly_price"        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                    <Th label="결제회차"   col="payment_stats.payment_count"       sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                    <Th label="누적결제금액" col="payment_stats.total_paid"        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
                    <Th label="최초결제일" col="payment_stats.first_payment_date"  sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <Th label="마지막결제일" col="payment_stats.last_payment_date" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <Th label="상태"       col="is_active"                         sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <Th label="가입일"     col="created_at"                        sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                    <Th label="탈퇴일"     col="withdrawn_at"                      sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedCompany(company)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{company.admin_user?.full_name || '-'}</div>
                        <div className="text-xs text-gray-400">{company.admin_user?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{company.stats.total_users}</td>
                      <td className="px-4 py-3">
                        {company.subscription ? (
                          <div>
                            <div className="text-gray-900">{company.subscription.plan_name || '-'}</div>
                            <div className="text-xs text-gray-400">{company.subscription.billing_cycle === 'monthly' ? '월간' : '연간'}</div>
                          </div>
                        ) : <span className="text-gray-400 text-xs">미가입</span>}
                      </td>
                      <td className="px-4 py-3">
                        {company.subscription ? (
                          <Badge variant={
                            company.subscription.status === 'active' ? 'default' :
                            company.subscription.status === 'trial' ? 'secondary' :
                            company.subscription.status === 'past_due' ? 'destructive' : 'outline'
                          }>
                            {company.subscription.status === 'active' ? '활성' :
                             company.subscription.status === 'trial' ? '체험중' :
                             company.subscription.status === 'past_due' ? '결제지연' :
                             company.subscription.status === 'canceled' ? '취소됨' : company.subscription.status}
                          </Badge>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {company.subscription ? `${company.subscription.monthly_price.toLocaleString()}원` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{company.payment_stats.payment_count}회</td>
                      <td className="px-4 py-3 text-right text-gray-700">{company.payment_stats.total_paid.toLocaleString()}원</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(company.payment_stats.first_payment_date)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(company.payment_stats.last_payment_date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={company.is_active && !company.withdrawn_at ? 'default' : 'secondary'}>
                          {company.withdrawn_at ? '탈퇴' : company.is_active ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(company.created_at)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(company.withdrawn_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}개
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={!pagination.hasPrev}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />이전
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">{pagination.page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!pagination.hasNext}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    다음<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
