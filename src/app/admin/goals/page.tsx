'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Target,
  Plus,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Goal {
  id: string
  name: string
  metric: string
  target_value: number
  current_value: number
  progress: string
  status: string
  period_start: string
  period_end: string
  company: {
    id: string
    name: string
  }
  created_by_user: {
    id: string
    full_name: string
  } | null
  created_at: string
}

const METRIC_LABELS: Record<string, string> = {
  leads: '리드 수',
  conversions: '전환 수',
  revenue: '매출',
  conversion_rate: '전환율',
}

const STATUS_LABELS: Record<string, string> = {
  active: '진행 중',
  achieved: '달성',
  failed: '실패',
  cancelled: '취소',
}

const STATUS_ICONS: Record<string, any> = {
  active: Clock,
  achieved: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-blue-600 bg-blue-50',
  achieved: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  cancelled: 'text-gray-600 bg-gray-50',
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('active')

  useEffect(() => {
    fetchGoals()
  }, [filter])

  async function fetchGoals() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/admin/api/goals?${params}`)
      if (!response.ok) throw new Error('Failed to fetch goals')

      const result = await response.json()
      setGoals(result.goals || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const achievedGoals = goals.filter((g) => g.status === 'achieved')
  const failedGoals = goals.filter((g) => g.status === 'failed')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">성과 목표 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            비즈니스 목표를 설정하고 진행 상황을 추적합니다
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 목표 추가
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">진행 중</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {activeGoals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">달성</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {achievedGoals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">실패</div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {failedGoals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전체</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {goals.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              전체
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              onClick={() => setFilter('active')}
            >
              진행 중
            </Button>
            <Button
              variant={filter === 'achieved' ? 'default' : 'outline'}
              onClick={() => setFilter('achieved')}
            >
              달성
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 목표 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const Icon = STATUS_ICONS[goal.status] || Target
          const colorClass = STATUS_COLORS[goal.status] || 'text-gray-600 bg-gray-50'
          const progress = parseFloat(goal.progress)

          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {goal.company.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(goal.period_start), 'yyyy.MM.dd', { locale: ko })} -{' '}
                        {format(new Date(goal.period_end), 'yyyy.MM.dd', { locale: ko })}
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 진행 상황 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {METRIC_LABELS[goal.metric] || goal.metric}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          progress >= 100
                            ? 'bg-green-500'
                            : progress >= 75
                            ? 'bg-blue-500'
                            : progress >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                      <span>
                        현재: {goal.current_value.toLocaleString()}
                      </span>
                      <span>
                        목표: {goal.target_value.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 상태 및 액션 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${colorClass}`}
                    >
                      {STATUS_LABELS[goal.status] || goal.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        상세보기
                      </Button>
                      {goal.status === 'active' && (
                        <Button size="sm">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          업데이트
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {goals.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            {filter === 'all'
              ? '등록된 목표가 없습니다'
              : `${filter === 'active' ? '진행 중인' : '달성한'} 목표가 없습니다`}
          </div>
        )}
      </div>
    </div>
  )
}
