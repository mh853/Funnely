'use client'

import { Users, FileText, Activity, TrendingUp, Shield } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { UserDetail } from '@/types/admin'
import Link from 'next/link'

interface OverviewTabProps {
  user: UserDetail
}

export default function OverviewTab({ user }: OverviewTabProps) {
  const stats = [
    {
      title: '총 리드',
      value: user.stats.total_leads,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      detail: `이번달: ${user.stats.leads_this_month}`,
    },
    {
      title: '랜딩페이지',
      value: user.stats.total_landing_pages,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      detail: `발행: ${user.stats.pages_published}`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.detail}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">이름</p>
              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">이메일</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">전화번호</p>
              <p className="text-sm font-medium text-gray-900">
                {user.phone || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">소속 회사</p>
              <Link
                href={`/admin/companies/${user.company.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {user.company.name}
              </Link>
            </div>
            <div>
              <p className="text-sm text-gray-500">사용자 ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono text-xs">{user.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 권한 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            권한 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {user.permissions.map((permission) => (
              <div key={permission} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{permission}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {user.recent_activities.length > 0 ? (
            <div className="space-y-3">
              {user.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm', {
                        locale: ko,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              최근 활동이 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
