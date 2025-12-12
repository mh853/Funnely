'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  HeadphonesIcon,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  description: string
  badge?: number
}

const navItems: NavItem[] = [
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
    icon: HeadphonesIcon,
    label: '문의 관리',
    href: '/admin/support',
    description: '고객 문의사항 처리',
  },
  {
    icon: Settings,
    label: '설정',
    href: '/admin/settings',
    description: '시스템 설정',
  },
]

interface AdminNavProps {
  user: {
    name: string
    email: string
  }
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
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
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group relative',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                  {item.description}
                </p>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
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
