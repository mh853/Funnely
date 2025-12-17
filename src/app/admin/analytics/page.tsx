'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Calendar, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { format, subDays } from 'date-fns'

interface ConversionData {
  funnel: Array<{
    stage: string
    label: string
    count: number
    percentage: number
  }>
  summary: {
    total: number
    converted: number
    lost: number
    conversionRate: number
  }
  stageConversionRates: {
    new_to_contacted: number
    contacted_to_qualified: number
    qualified_to_converted: number
  }
}

interface ChannelData {
  channels: Array<{
    source: string
    total: number
    converted: number
    conversionRate: number
  }>
  topChannels: Array<{
    source: string
    total: number
    conversionRate: number
  }>
  summary: {
    totalLeads: number
    totalConverted: number
    overallConversionRate: number
  }
}

interface TrendData {
  trends: Array<{
    date: string
    total: number
    converted: number
  }>
  summary: {
    totalLeads: number
    avgLeadsPerPeriod: number
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [conversionData, setConversionData] = useState<ConversionData | null>(null)
  const [channelData, setChannelData] = useState<ChannelData | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd')

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })

      // 병렬로 데이터 조회
      const [conversionRes, channelRes, trendRes] = await Promise.all([
        fetch(`/api/admin/analytics/conversion?${params}`),
        fetch(`/api/admin/analytics/channels?${params}`),
        fetch(`/api/admin/analytics/trends?${params}`),
      ])

      if (!conversionRes.ok || !channelRes.ok || !trendRes.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const [conversion, channel, trend] = await Promise.all([
        conversionRes.json(),
        channelRes.json(),
        trendRes.json(),
      ])

      setConversionData(conversion)
      setChannelData(channel)
      setTrendData(trend)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !conversionData || !channelData || !trendData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">고급 분석</h2>
          <p className="text-sm text-gray-500 mt-1">
            비즈니스 성과 및 트렌드 분석
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">최근 7일</SelectItem>
              <SelectItem value="30">최근 30일</SelectItem>
              <SelectItem value="90">최근 90일</SelectItem>
              <SelectItem value="180">최근 180일</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics}>
            <Calendar className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전체 리드</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {conversionData.summary.total.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              일평균 {trendData.summary.avgLeadsPerPeriod.toFixed(1)}건
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전환완료</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {conversionData.summary.converted.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              전환율 {conversionData.summary.conversionRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">채널 성과</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {channelData.summary.overallConversionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              전체 채널 평균 전환율
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">실패</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {conversionData.summary.lost.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              실패율 {conversionData.summary.total > 0
                ? ((conversionData.summary.lost / conversionData.summary.total) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 전환 퍼널 */}
      <Card>
        <CardHeader>
          <CardTitle>전환 퍼널 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData.funnel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="리드 수" />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-sm text-gray-500">신규 → 연락완료</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {conversionData.stageConversionRates.new_to_contacted.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">연락완료 → 적격</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {conversionData.stageConversionRates.contacted_to_qualified.toFixed(1)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">적격 → 전환완료</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {conversionData.stageConversionRates.qualified_to_converted.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시계열 트렌드 */}
      <Card>
        <CardHeader>
          <CardTitle>리드 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                name="전체 리드"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="converted"
                stroke="#10b981"
                name="전환완료"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 채널별 성과 */}
      <Card>
        <CardHeader>
          <CardTitle>채널별 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData.topChannels}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, total }) => `${source}: ${total}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {channelData.topChannels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-4">
              {channelData.topChannels.map((channel, index) => (
                <div key={channel.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{channel.source}</div>
                      <div className="text-sm text-gray-500">
                        {channel.total}개 리드
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      {channel.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">전환율</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
