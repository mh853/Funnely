'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  MegaphoneIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  userProfile: any
}

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: HomeIcon },
  { name: '캠페인', href: '/dashboard/campaigns', icon: MegaphoneIcon },
  { name: '광고 계정', href: '/dashboard/ad-accounts', icon: ChartBarIcon },
  { name: '리포트', href: '/dashboard/reports', icon: DocumentTextIcon },
  { name: '팀 관리', href: '/dashboard/team', icon: UsersIcon },
  { name: '설정', href: '/dashboard/settings', icon: CogIcon },
]

export default function Sidebar({ userProfile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-2xl font-bold text-blue-600">메디씽크</h1>
        </div>

        {/* Hospital Info */}
        {userProfile?.hospitals && (
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-gray-600">병원</p>
            <p className="font-medium text-gray-900 truncate">
              {userProfile.hospitals.name}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
