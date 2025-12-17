'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Activity as ActivityIcon } from 'lucide-react'
import type { CompanyActivitiesResponse } from '@/types/admin'

interface ActivityTabProps {
  companyId: string
}

export default function ActivityTab({ companyId }: ActivityTabProps) {
  const [data, setData] = useState<CompanyActivitiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    fetchActivities()
  }, [companyId, dateRange])

  async function fetchActivities() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        dateRange,
        page: '1',
        limit: '50',
      })

      const response = await fetch(
        `/api/admin/companies/${companyId}/activities?${params}`
      )
      if (!response.ok) throw new Error('Failed to fetch activities')

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 통계 */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">총 활동 기록</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data.pagination.total}
          </p>
        </div>
      )}

      {/* 날짜 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('all')}
            className={`px-3 py-1 text-sm rounded-md ${
              dateRange === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setDateRange('7d')}
            className={`px-3 py-1 text-sm rounded-md ${
              dateRange === '7d'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            최근 7일
          </button>
          <button
            onClick={() => setDateRange('30d')}
            className={`px-3 py-1 text-sm rounded-md ${
              dateRange === '30d'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            최근 30일
          </button>
          <button
            onClick={() => setDateRange('90d')}
            className={`px-3 py-1 text-sm rounded-md ${
              dateRange === '90d'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            최근 90일
          </button>
        </div>
      </div>

      {/* 활동 타임라인 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <div className="text-center text-gray-500 py-8">로딩 중...</div>
        ) : data && data.activities.length > 0 ? (
          <div className="space-y-4">
            {data.activities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
              >
                {/* 타임라인 아이콘 */}
                <div className="flex flex-col items-center">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <ActivityIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  {index < data.activities.length - 1 && (
                    <div className="w-px h-full bg-gray-200 mt-2" />
                  )}
                </div>

                {/* 활동 내용 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {activity.user_name}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.action}</span>
                        {activity.ip_address && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              IP: {activity.ip_address}
                            </span>
                          </>
                        )}
                      </div>
                      {activity.metadata && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">활동 기록이 없습니다</div>
        )}
      </div>
    </div>
  )
}
