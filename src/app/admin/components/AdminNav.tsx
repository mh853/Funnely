'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  HeadphonesIcon,
  BarChart3,
  Settings,
  TrendingUp,
  FileBarChart,
  Bell,
  Target,
  CreditCard,
  DollarSign,
  Activity,
  Shield,
  HeartPulse,
  Zap,
  Layers,
  Mail,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  description: string
  badge?: number
}

interface NavGroup {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const mainNavItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: '대시보드',
    href: '/admin',
    description: '전체 시스템 현황',
  },
  {
    icon: BarChart3,
    label: '향상된 대시보드',
    href: '/admin/dashboard-new',
    description: '성장 추이 및 분석',
  },
  {
    icon: Building2,
    label: '회사 관리',
    href: '/admin/companies',
    description: '모든 회사 조회 및 관리',
  },
  {
    icon: Users,
    label: '사용자 관리',
    href: '/admin/users',
    description: '모든 사용자 조회 및 관리',
  },
  {
    icon: Bell,
    label: '알림 센터',
    href: '/admin/notifications',
    description: '알림 조회 및 관리',
  },
  {
    icon: CreditCard,
    label: '구독 관리',
    href: '/admin/subscriptions',
    description: '회사별 구독 상태 관리',
  },
  {
    icon: DollarSign,
    label: '수익 대시보드',
    href: '/admin/revenue',
    description: 'MRR/ARR 및 수익 추이',
  },
  {
    icon: DollarSign,
    label: '매출 관리',
    href: '/admin/billing',
    description: '결제 및 청구 현황',
  },
  {
    icon: HeartPulse,
    label: '고객 건강도',
    href: '/admin/health',
    description: '고객 건강도 점수 및 리스크 관리',
  },
  {
    icon: TrendingUp,
    label: '이탈 분석',
    href: '/admin/churn',
    description: '구독 취소 패턴 및 예방 가능 이탈',
  },
  {
    icon: Target,
    label: '성장 기회',
    href: '/admin/growth-opportunities',
    description: '업셀 기회 및 다운셀 위험 식별',
  },
  {
    icon: Activity,
    label: '시스템 모니터링',
    href: '/admin/monitoring',
    description: '성능 및 에러 모니터링',
  },
  {
    icon: HeadphonesIcon,
    label: '문의 관리',
    href: '/admin/support',
    description: '고객 문의사항 처리',
  },
]

const otherNavGroup: NavGroup = {
  label: '기타',
  icon: MoreHorizontal,
  items: [
    {
      icon: FileText,
      label: '리드 관리',
      href: '/admin/leads',
      description: '모든 리드 조회 및 관리',
    },
    {
      icon: TrendingUp,
      label: '고급 분석',
      href: '/admin/analytics',
      description: '비즈니스 성과 분석',
    },
    {
      icon: FileBarChart,
      label: '리포트',
      href: '/admin/reports',
      description: '리포트 생성 및 관리',
    },
    {
      icon: Target,
      label: '성과 목표',
      href: '/admin/goals',
      description: '목표 설정 및 진행 추적',
    },
    {
      icon: Zap,
      label: '워크플로우',
      href: '/admin/workflows',
      description: '자동화 워크플로우 관리',
    },
    {
      icon: Layers,
      label: '일괄 작업',
      href: '/admin/bulk-operations',
      description: '대량 데이터 일괄 처리',
    },
    {
      icon: Mail,
      label: '이메일 템플릿',
      href: '/admin/email-templates',
      description: '이메일 템플릿 관리',
    },
    {
      icon: Shield,
      label: '감사 로그',
      href: '/admin/audit-logs',
      description: '모든 관리자 작업 추적',
    },
    {
      icon: Shield,
      label: '역할 관리',
      href: '/admin/settings/roles',
      description: '관리자 역할 및 권한 관리',
    },
    {
      icon: Settings,
      label: '설정',
      href: '/admin/settings',
      description: '시스템 설정',
    },
  ],
}

interface AdminNavProps {
  user: {
    name: string
    email: string
  }
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()
  const [otherGroupExpanded, setOtherGroupExpanded] = useState(false)

  // Check if any item in "기타" group is active
  const isOtherGroupActive = otherNavGroup.items.some(
    (item) => pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
  )

  return (
    <aside className="w-[200px] bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <p className="font-bold text-gray-900">퍼널리</p>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Main Navigation Items */}
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group relative',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* "기타" Group */}
        <div className="pt-2">
          <button
            onClick={() => setOtherGroupExpanded(!otherGroupExpanded)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group relative',
              isOtherGroupActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <otherNavGroup.icon className="w-5 h-5" />
            <span className="font-medium text-sm flex-1 text-left">{otherNavGroup.label}</span>
            {otherGroupExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* "기타" Sub-items */}
          {otherGroupExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {otherNavGroup.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors group relative',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-xs">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-gray-600 font-medium text-sm">
              {user.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
