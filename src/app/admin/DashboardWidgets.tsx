'use client'

// /admin/settings/dashboard에서 저장한 위젯 표시/순서 설정을 실제로 반영하는
// 클라이언트 컴포넌트. 이전에는 그 설정 페이지가 localStorage에만 저장하고
// 대시보드(서버 컴포넌트라 localStorage 접근 불가)는 이를 전혀 참조하지 않아
// 완전히 무의미한 UI였다(53차 QA 확인) - 통계 카드 부분만이라도 실제로
// 연결한다(전체 위젯 카탈로그 재설계는 범위 밖으로 보류).
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Users, TrendingUp, CreditCard, DollarSign,
  LogOut, XCircle, MessageSquare, MousePointerClick,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'

interface MonthStats {
  signups: number
  trials: number
  payments: number
  revenue: number
  withdrawals: number
  cancellations: number
  tickets: number
  leads: number
}

interface DashboardData {
  thisMonth: MonthStats
  lastMonth: MonthStats
  recent: {
    signups: Array<{ id: string; name: string; date: string }>
    payments: Array<{ id: string; companyName: string; amount: number; date: string }>
    withdrawals: Array<{ id: string; name: string; date: string }>
    cancellations: Array<{ id: string; companyName: string; date: string }>
    tickets: Array<{ id: string; subject: string; companyName: string; date: string }>
  }
}

interface Widget {
  id: string
  enabled: boolean
  order: number
}

const STAT_CONFIG = [
  { key: 'leads',         label: '유입',    unit: '건', icon: MousePointerClick, color: 'text-violet-500',  bg: 'bg-violet-50' },
  { key: 'signups',       label: '회원가입', unit: '건', icon: Users,             color: 'text-indigo-500',  bg: 'bg-indigo-50' },
  { key: 'trials',        label: '무료체험', unit: '건', icon: TrendingUp,        color: 'text-blue-500',    bg: 'bg-blue-50' },
  { key: 'payments',      label: '결제',    unit: '건', icon: CreditCard,        color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { key: 'revenue',       label: '매출',    unit: '원', icon: DollarSign,        color: 'text-green-500',   bg: 'bg-green-50' },
  { key: 'withdrawals',   label: '탈퇴',    unit: '건', icon: LogOut,            color: 'text-rose-500',    bg: 'bg-rose-50' },
  { key: 'cancellations', label: '구독취소', unit: '건', icon: XCircle,           color: 'text-orange-500',  bg: 'bg-orange-50' },
  { key: 'tickets',       label: '문의',    unit: '건', icon: MessageSquare,     color: 'text-sky-500',     bg: 'bg-sky-50' },
] as const

function calcDelta(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

function DeltaBadge({ current, prev, invert = false }: { current: number; prev: number; invert?: boolean }) {
  const delta = calcDelta(current, prev)
  if (delta === 0 && current === 0 && prev === 0) return null

  const isGood = invert ? delta <= 0 : delta >= 0
  const isZero = delta === 0

  if (isZero) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <Minus className="w-3 h-3" />
        전월 동일
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>
      {delta > 0
        ? <ArrowUpRight className="w-3 h-3" />
        : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(delta)}%
    </span>
  )
}

function StatBox({
  label, value, prevValue, unit, icon: Icon, color, bg, invert = false,
}: {
  label: string; value: number; prevValue: number; unit: string
  icon: React.ComponentType<{ className?: string }>
  color: string; bg: string; invert?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {value.toLocaleString()}
          <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
        </p>
        <div className="mt-1.5">
          <DeltaBadge current={value} prev={prevValue} invert={invert} />
        </div>
      </div>
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${color}`} />
      </div>
    </div>
  )
}

function RecentList({
  title, items, accent,
}: {
  title: string
  items: Array<{ label: string; sub?: string; date: string }>
  accent: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
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
                {format(new Date(item.date), 'MM-dd', { locale: ko })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const RECENT_ACCENTS = ['bg-indigo-400', 'bg-emerald-400', 'bg-rose-400', 'bg-orange-400', 'bg-sky-400']

export default function DashboardWidgets({ data }: { data: DashboardData }) {
  const [widgetPrefs, setWidgetPrefs] = useState<Widget[] | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets')
      if (saved) setWidgetPrefs(JSON.parse(saved))
    } catch {
      // 파싱 실패 시 기본(전체 표시) 유지
    }
  }, [])

  const isEnabled = (id: string) => {
    if (!widgetPrefs) return true
    const w = widgetPrefs.find((x) => x.id === id)
    return w ? w.enabled : true
  }
  const orderOf = (id: string) => {
    if (!widgetPrefs) return 0
    return widgetPrefs.find((x) => x.id === id)?.order ?? 0
  }

  const visibleStats = STAT_CONFIG
    .filter((cfg) => isEnabled(cfg.key))
    .sort((a, b) => orderOf(a.key) - orderOf(b.key))

  const recentColumns = [
    { title: '회원가입', items: data.recent.signups.map((s) => ({ label: s.name, date: s.date })) },
    { title: '결제', items: data.recent.payments.map((p) => ({ label: p.companyName, sub: `${p.amount.toLocaleString()}원`, date: p.date })) },
    { title: '탈퇴', items: data.recent.withdrawals.map((w) => ({ label: w.name, date: w.date })) },
    { title: '구독취소', items: data.recent.cancellations.map((c) => ({ label: c.companyName, date: c.date })) },
    { title: '문의', items: data.recent.tickets.map((t) => ({ label: t.companyName, sub: t.subject, date: t.date })) },
  ]

  return (
    <>
      {visibleStats.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">이번달</p>
          <div className="grid grid-cols-4 gap-4">
            {visibleStats.map((cfg) => (
              <StatBox
                key={cfg.key}
                label={cfg.label}
                unit={cfg.unit}
                value={(data.thisMonth as any)[cfg.key]}
                prevValue={(data.lastMonth as any)?.[cfg.key] ?? 0}
                icon={cfg.icon}
                color={cfg.color}
                bg={cfg.bg}
                invert={cfg.key === 'withdrawals' || cfg.key === 'cancellations'}
              />
            ))}
          </div>
        </div>
      )}

      {isEnabled('recent_activities') && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">최신 현황 (각 최대 3건)</p>
          <div className="grid grid-cols-5 gap-4">
            {recentColumns.map((col, i) => (
              <RecentList key={col.title} title={col.title} items={col.items} accent={RECENT_ACCENTS[i]} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
