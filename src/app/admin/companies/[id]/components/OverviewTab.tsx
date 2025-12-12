'use client'

import { Users, FileText, Activity, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { CompanyDetail } from '@/types/admin'

interface OverviewTabProps {
  company: CompanyDetail
}

export default function OverviewTab({ company }: OverviewTabProps) {
  const stats = [
    {
      title: '총 사용자',
      value: company.stats.total_users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      detail: `활성: ${company.detailed_stats.active_users}, 비활성: ${company.detailed_stats.inactive_users}`,
    },
    {
      title: '총 리드',
      value: company.stats.total_leads,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      detail: `이번달: ${company.detailed_stats.leads_this_month}, 지난달: ${company.detailed_stats.leads_last_month}`,
    },
    {
      title: '랜딩페이지',
      value: company.stats.landing_pages_count,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      detail: `활성: ${company.detailed_stats.active_landing_pages}`,
    },
    {
      title: '이번달 신규 리드',
      value: company.detailed_stats.leads_this_month,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      detail:
        company.detailed_stats.leads_last_month > 0
          ? `전월 대비 ${Math.round(
              ((company.detailed_stats.leads_this_month -
                company.detailed_stats.leads_last_month) /
                company.detailed_stats.leads_last_month) *
                100
            )}%`
          : '비교 데이터 없음',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-500">회사명</p>
              <p className="text-sm font-medium text-gray-900">{company.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">회사 ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono text-xs">{company.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">전화번호</p>
              <p className="text-sm font-medium text-gray-900">
                {company.phone || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">사업자번호</p>
              <p className="text-sm font-medium text-gray-900">
                {company.business_number || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">주소</p>
              <p className="text-sm font-medium text-gray-900">
                {company.address || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {company.recent_activities.length > 0 ? (
            <div className="space-y-3">
              {company.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.user_name} •{' '}
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
