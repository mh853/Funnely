'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { UserActivitiesResponse } from '@/types/admin'

interface ActivityTabProps {
  userId: string
}

export default function ActivityTab({ userId }: ActivityTabProps) {
  const [data, setData] = useState<UserActivitiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchActivities()
  }, [userId, dateRange, page])

  async function fetchActivities() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        dateRange,
        page: page.toString(),
        limit: '20',
      })

      const response = await fetch(`/api/admin/users/${userId}/activities?${params}`)
      if (!response.ok) throw new Error('Failed to fetch activities')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('활동 로그를 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleDateRangeChange(newRange: string) {
    setDateRange(newRange)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleDateRangeChange('all')}
          className={`px-3 py-1 text-sm rounded-md ${
            dateRange === 'all'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          전체 기간
        </button>
        <button
          onClick={() => handleDateRangeChange('7d')}
          className={`px-3 py-1 text-sm rounded-md ${
            dateRange === '7d'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          최근 7일
        </button>
        <button
          onClick={() => handleDateRangeChange('30d')}
          className={`px-3 py-1 text-sm rounded-md ${
            dateRange === '30d'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          최근 30일
        </button>
      </div>

      {/* 활동 목록 */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : data && data.activities.length > 0 ? (
            <>
              <div className="space-y-4">
                {data.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss', {
                            locale: ko,
                          })}
                        </p>
                        {activity.ip_address && (
                          <span className="text-xs text-gray-400">
                            • IP: {activity.ip_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {data.pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    총 {data.pagination.total}개 중 {(page - 1) * 20 + 1}-
                    {Math.min(page * 20, data.pagination.total)}개 표시
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!data.pagination.hasPrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      {page} / {data.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!data.pagination.hasNext}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              활동 내역이 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
