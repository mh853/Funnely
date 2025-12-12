'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface BillingMetrics {
  mrr: number
  arr: number
  monthlyRevenue: number
  activeSubscriptions: number
  statusDistribution: Record<string, number>
  planDistribution: Record<string, number>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function BillingPage() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      setLoading(true)
      const response = await fetch('/admin/api/subscriptions/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')

      const result = await response.json()
      setMetrics(result)
    } catch (error) {
      console.error('Error fetching billing metrics:', error)
    } finally {
      setLoading(false)
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

  const statusData = Object.entries(metrics.statusDistribution).map(
    ([name, value]) => ({
      name: name === 'active' ? '활성' : name === 'trial' ? '체험' : name,
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구독 상태별 분포</CardTitle>
          </CardHeader>
          <CardContent>
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
                    {status === 'active'
                      ? '활성'
                      : status === 'trial'
                      ? '체험'
                      : status === 'expired'
                      ? '만료'
                      : status === 'cancelled'
                      ? '취소'
                      : status}
                  </span>
                  <span className="text-sm text-gray-600">{count}개</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
