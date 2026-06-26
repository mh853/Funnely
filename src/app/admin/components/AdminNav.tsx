'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileBarChart, Building2, HeadphonesIcon, MessageSquare, Users, CreditCard, BarChart3, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: '대시보드',    href: '/admin' },
  { icon: FileBarChart,    label: '리포트',      href: '/admin/reports' },
  { icon: Building2,       label: '고객사 관리',  href: '/admin/companies' },
  { icon: Users,           label: '사용자 관리',  href: '/admin/users' },
  { icon: CreditCard,      label: '구독 관리',    href: '/admin/subscriptions' },
  { icon: Receipt,         label: '매출/결제',    href: '/admin/billing' },
  { icon: BarChart3,       label: '분석',         href: '/admin/analytics' },
  { icon: HeadphonesIcon,  label: '문의',         href: '/admin/support' },
  { icon: MessageSquare,   label: '홈페이지 문의', href: '/admin/support/inquiries' },
]

interface AdminNavProps {
  user: { name: string; email: string }
}

export default function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <aside className="w-[200px] bg-white border-r border-gray-100 flex flex-col shadow-sm sticky top-0 h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
            <span className="text-white font-bold text-base">F</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">퍼널리</p>
            <p className="text-[11px] text-gray-400 tracking-wide">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : item.href === '/admin/support'
              ? pathname.startsWith('/admin/support') && !pathname.startsWith('/admin/support/inquiries')
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-600' : 'text-gray-400')} />
              <span className="text-sm">{item.label}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
