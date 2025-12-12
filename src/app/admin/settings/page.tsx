'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Bell,
  Shield,
  Database,
  Mail,
  Palette,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react'

interface SettingCategory {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
  badge?: string
}

const settingCategories: SettingCategory[] = [
  {
    icon: LayoutDashboard,
    title: '대시보드 커스터마이징',
    description: '대시보드 위젯 표시 설정 및 순서 변경',
    href: '/admin/settings/dashboard',
  },
  {
    icon: Bell,
    title: '알림 설정',
    description: '알림 유형별 채널 설정 및 알림 수신 관리',
    href: '/admin/notifications/settings',
  },
  {
    icon: Shield,
    title: '보안 설정',
    description: '접근 권한, 인증 방식 및 보안 정책 관리',
    href: '/admin/settings/security',
    badge: '준비 중',
  },
  {
    icon: Database,
    title: '데이터 관리',
    description: '데이터 백업, 복원 및 데이터베이스 관리',
    href: '/admin/settings/data',
    badge: '준비 중',
  },
  {
    icon: Mail,
    title: '이메일 설정',
    description: 'SMTP 설정, 이메일 템플릿 및 발송 관리',
    href: '/admin/settings/email',
    badge: '준비 중',
  },
  {
    icon: Palette,
    title: '테마 설정',
    description: '시스템 테마, 색상 및 브랜딩 커스터마이징',
    href: '/admin/settings/theme',
    badge: '준비 중',
  },
  {
    icon: Users,
    title: '사용자 역할 관리',
    description: '사용자 역할 정의 및 권한 설정',
    href: '/admin/settings/roles',
    badge: '준비 중',
  },
  {
    icon: SettingsIcon,
    title: '시스템 설정',
    description: '일반 시스템 설정 및 환경 구성',
    href: '/admin/settings/system',
    badge: '준비 중',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">시스템 설정</h2>
        <p className="text-sm text-gray-500 mt-1">
          시스템 전반의 설정을 관리합니다
        </p>
      </div>

      {/* 설정 카테고리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingCategories.map((category) => {
          const Icon = category.icon
          const isDisabled = category.badge === '준비 중'

          return (
            <Link
              key={category.href}
              href={isDisabled ? '#' : category.href}
              className={isDisabled ? 'pointer-events-none' : ''}
            >
              <Card
                className={`transition-all ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-md hover:border-blue-300 cursor-pointer'
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {category.title}
                          </h3>
                          {category.badge && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              {category.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    {!isDisabled && (
                      <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>설정 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                시스템 버전
              </span>
              <span className="text-sm text-gray-600">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                데이터베이스
              </span>
              <span className="text-sm text-gray-600">PostgreSQL (Supabase)</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-gray-700">
                마지막 업데이트
              </span>
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
