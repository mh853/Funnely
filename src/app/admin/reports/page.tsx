'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Download } from 'lucide-react'

interface DailyRow {
  date: string
  leads: number
  signups: number
  trials: number
  payments: number
  revenue: number
  withdrawals: number
  cancellations: number
  tickets: number
}

interface AnalyticsData {
  rows: DailyRow[]
  totals: Omit<DailyRow, 'date'>
}

function toInputDate(date: Date) {
  return date.toISOString().split('T')[0]
}

const COLS = [
  { key: 'leads',         label: '유입',    unit: '건' },
  { key: 'signups',       label: '회원가입', unit: '처' },
  { key: 'trials',        label: '무료체험', unit: '처' },
  { key: 'payments',      label: '결제',    unit: '건' },
  { key: 'revenue',       label: '매출',    unit: '원' },
  { key: 'withdrawals',   label: '탈퇴',    unit: '처' },
  { key: 'cancellations', label: '구독취소', unit: '처' },
  { key: 'tickets',       label: '문의',    unit: '건' },
] as const

export default function ReportsPage() {
  const today = new Date()
  const [fromDate, setFromDate] = useState(toInputDate(subDays(today, 6)))
  const [toDate, setToDate] = useState(toInputDate(today))
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [fromDate, toDate])

  async function fetchData() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const res = await fetch(`/admin/api/analytics/daily?${params}`)
      if (!res.ok) throw new Error('fetch failed')
      setData(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleExportCSV() {
    if (!data) return
    const headers = ['날짜', ...COLS.map((c) => `${c.label}(${c.unit})`)]
    const rows = data.rows.map((r) => [
      r.date,
      r.leads, r.signups, r.trials, r.payments,
      r.revenue, r.withdrawals, r.cancellations, r.tickets,
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `리포트_${fromDate}_${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totals = data?.totals

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100 flex items-end justify-between">
        <div>
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Reports</p>
          <h2 className="text-2xl font-bold text-white">리포트</h2>
          <p className="text-indigo-200 text-sm mt-1">일별 지표를 확인합니다</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!data}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors backdrop-blur-sm border border-white/30"
        >
          <Download className="h-4 w-4" />
          CSV 다운로드
        </button>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">시작일</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <span className="text-gray-300">~</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">종료일</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={toInputDate(today)}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 ml-2">
            {[
              { label: '7일',  days: 6  },
              { label: '14일', days: 13 },
              { label: '30일', days: 29 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  setFromDate(toInputDate(subDays(today, days)))
                  setToDate(toInputDate(today))
                }}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium"
              >
                최근 {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-100 border-t-indigo-600 mx-auto" />
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">데이터가 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[160px]" />
                {COLS.map((c) => <col key={c.key} />)}
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide">
                    날짜
                  </th>
                  {COLS.map((c, i) => (
                    <th
                      key={c.key}
                      className={`py-3 text-right text-xs font-semibold text-gray-500 tracking-wide whitespace-nowrap ${i === COLS.length - 1 ? 'pl-4 pr-6' : 'px-4'}`}
                    >
                      {c.label}
                      <span className="text-gray-400 font-normal">({c.unit})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {totals && (
                  <tr className="bg-indigo-50">
                    <td className="px-5 py-3 text-sm font-bold text-indigo-700">합계</td>
                    {COLS.map((c, i) => (
                      <td key={c.key} className={`py-3 text-right text-sm font-bold text-indigo-700 ${i === COLS.length - 1 ? 'pl-4 pr-6' : 'px-4'}`}>
                        {(totals[c.key] as number).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                )}
                {[...data.rows].reverse().map((row) => (
                  <tr key={row.date} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {format(new Date(row.date), 'yyyy.MM.dd (EEE)', { locale: ko })}
                    </td>
                    {COLS.map((c, i) => (
                      <td key={c.key} className={`py-3 text-right text-sm text-gray-700 ${i === COLS.length - 1 ? 'pl-4 pr-6' : 'px-4'}`}>
                        {(row[c.key] as number).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
