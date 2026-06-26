'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, CreditCard, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface BillingMetrics {
  mrr: number
  arr: number
  monthlyRevenue: number
  activeSubscriptions: number
  statusDistribution: Record<string, number>
  planDistribution: Record<string, number>
}

interface Transaction {
  id: string
  total_amount: number
  status: string
  approved_at: string | null
  created_at: string
  company: { id: string; name: string } | null
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const STATUS_LABELS: Record<string, string> = {
  active: '활성',
  trial: '체험',
  expired: '만료',
  cancelled: '취소',
  canceled: '취소',
  past_due: '연체',
  free: '무료',
}

const TX_STATUS_LABELS: Record<string, string> = {
  success: '성공',
  failed: '실패',
  pending: '대기',
  cancelled: '취소',
  refunded: '환불',
}

const TX_STATUS_COLORS: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  try { return format(new Date(d), 'yyyy.MM.dd HH:mm', { locale: ko }) } catch { return '-' }
}

export default function BillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotalPages, setTxTotalPages] = useState(1)
  const [txLoading, setTxLoading] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [txPage])

  async function fetchMetrics() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/subscriptions/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')

      const result = await response.json()
      setMetrics(result)
    } catch (error) {
      console.error('Error fetching billing metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTransactions() {
    try {
      setTxLoading(true)
      const params = new URLSearchParams({ page: txPage.toString(), limit: '15' })
      const res = await fetch(`/admin/api/payments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch transactions')
      const result = await res.json()
      setTransactions(result.payments || [])
      setTxTotalPages(result.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setTxLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const planData = Object.entries(metrics.planDistribution).map(([name, value]) => ({
    name,
    value,
  }))

  const STATUS_LABELS: Record<string, string> = {
    active: '활성',
    trial: '체험',
    expired: '만료',
    cancelled: '취소',
    canceled: '취소',
    past_due: '연체',
    free: '무료',
  }

  const statusData = Object.entries(metrics.statusDistribution).map(
    ([name, value]) => ({
      name: STATUS_LABELS[name] ?? name,
      value,
    })
  )

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">매출 및 결제 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          구독 매출, MRR/ARR 및 결제 현황을 관리합니다
        </p>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">MRR</div>
                <div className="text-2xl font-bold text-blue-600 mt-2">
                  ₩{metrics.mrr.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Monthly Recurring Revenue
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">ARR</div>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  ₩{metrics.arr.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Annual Recurring Revenue
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">이번 달 매출</div>
                <div className="text-2xl font-bold text-purple-600 mt-2">
                  ₩{metrics.monthlyRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  결제 성공 금액 합계
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500">활성 구독</div>
                <div className="text-2xl font-bold text-orange-600 mt-2">
                  {metrics.activeSubscriptions.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">현재 활성화된 구독</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>플랜별 구독 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length === 0 || planData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">데이터가 없습니다</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {planData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구독 상태별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 || statusData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">데이터가 없습니다</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 상세 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>플랜별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.planDistribution).map(([plan, count]) => (
                <div
                  key={plan}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{plan}</span>
                  <span className="text-sm text-gray-600">{count}개 구독</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>상태별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.statusDistribution).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="text-sm text-gray-600">{count}개</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 결제 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">로딩 중...</div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">결제 내역이 없습니다</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">회사</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">금액</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">상태</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">결제일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {tx.company?.name ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          ₩{tx.total_amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${TX_STATUS_COLORS[tx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TX_STATUS_LABELS[tx.status] ?? tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {fmtDate(tx.approved_at ?? tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {txTotalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={() => setTxPage(p => p - 1)} disabled={txPage <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-500">{txPage} / {txTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setTxPage(p => p + 1)} disabled={txPage >= txTotalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
