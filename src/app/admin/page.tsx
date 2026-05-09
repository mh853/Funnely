'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Users, TrendingUp, CreditCard, DollarSign,
  LogOut, XCircle, MessageSquare, MousePointerClick,
} from 'lucide-react'

interface DashboardData {
  thisMonth: {
    signups: number
    trials: number
    payments: number
    revenue: number
    withdrawals: number
    cancellations: number
    tickets: number
    leads: number
  }
  recent: {
    signups: Array<{ id: string; name: string; date: string }>
    payments: Array<{ id: string; companyName: string; amount: number; date: string }>
    withdrawals: Array<{ id: string; name: string; date: string }>
    cancellations: Array<{ id: string; companyName: string; date: string }>
    tickets: Array<{ id: string; subject: string; companyName: string; date: string }>
  }
}

const STAT_CONFIG = [
  { key: 'leads',         label: '유입',    unit: '건', icon: MousePointerClick, color: 'text-violet-500',  bg: 'bg-violet-50' },
  { key: 'signups',       label: '회원가입', unit: '처', icon: Users,             color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  { key: 'trials',        label: '무료체험', unit: '처', icon: TrendingUp,        color: 'text-blue-500',    bg: 'bg-blue-50' },
  { key: 'payments',      label: '결제',    unit: '건', icon: CreditCard,        color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'revenue',       label: '매출',    unit: '원', icon: DollarSign,        color: 'text-green-500',   bg: 'bg-green-50' },
  { key: 'withdrawals',   label: '탈퇴',    unit: '처', icon: LogOut,            color: 'text-rose-500',    bg: 'bg-rose-50' },
  { key: 'cancellations', label: '구독취소', unit: '처', icon: XCircle,           color: 'text-orange-500',  bg: 'bg-orange-50' },
  { key: 'tickets',       label: '문의',    unit: '건', icon: MessageSquare,     color: 'text-sky-500',     bg: 'bg-sky-50' },
] as const

function StatBox({
  label, value, unit, icon: Icon, color, bg,
}: {
  label: string; value: number; unit: string
  icon: React.ComponentType<{ className?: string }>
  color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {value.toLocaleString()}
          <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
        </p>
      </div>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
    </div>
  )
}

function RecentList({
  title,
  items,
  accent,
}: {
  title: string
  items: Array<{ label: string; sub?: string; date: string }>
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-3.5 border-b border-gray-100 flex items-center gap-2`}>
        <div className={`w-1.5 h-4 rounded-full ${accent}`} />
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">없음</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-2 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                {item.sub && <p className="text-xs text-indigo-600 font-medium truncate mt-0.5">{item.sub}</p>}
              </div>
              <p className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                {format(new Date(item.date), 'MM.dd', { locale: ko })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const RECENT_ACCENTS = [
  'bg-indigo-400',
  'bg-emerald-400',
  'bg-rose-400',
  'bg-orange-400',
  'bg-sky-400',
]

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/admin/api/stats')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-100 border-t-indigo-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400 text-sm">
        데이터를 불러올 수 없습니다
      </div>
    )
  }

  const recentColumns = [
    { title: '회원가입', items: data.recent.signups.map((s) => ({ label: s.name, date: s.date })) },
    { title: '결제', items: data.recent.payments.map((p) => ({ label: p.companyName, sub: `${p.amount.toLocaleString()}원`, date: p.date })) },
    { title: '탈퇴', items: data.recent.withdrawals.map((w) => ({ label: w.name, date: w.date })) },
    { title: '구독취소', items: data.recent.cancellations.map((c) => ({ label: c.companyName, date: c.date })) },
    { title: '문의', items: data.recent.tickets.map((t) => ({ label: t.companyName, sub: t.subject, date: t.date })) },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100">
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Dashboard</p>
        <h2 className="text-2xl font-bold text-white">대시보드</h2>
        <p className="text-indigo-200 text-sm mt-1">
          {now.getFullYear()}년 {now.getMonth() + 1}월 현황
        </p>
      </div>

      {/* 이번달 통계 */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">이번달</p>
        <div className="grid grid-cols-4 gap-4">
          {STAT_CONFIG.map((cfg) => (
            <StatBox
              key={cfg.key}
              label={cfg.label}
              unit={cfg.unit}
              value={(data.thisMonth as any)[cfg.key]}
              icon={cfg.icon}
              color={cfg.color}
              bg={cfg.bg}
            />
          ))}
        </div>
      </div>

      {/* 최신 현황 */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">최신 현황 (각 최대 3건)</p>
        <div className="grid grid-cols-5 gap-4">
          {recentColumns.map((col, i) => (
            <RecentList key={col.title} title={col.title} items={col.items} accent={RECENT_ACCENTS[i]} />
          ))}
        </div>
      </div>
    </div>
  )
}
