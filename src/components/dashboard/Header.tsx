'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu } from '@headlessui/react'
import { Bars3Icon, ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import NotificationBell from './NotificationBell'

interface HeaderProps {
  user: any
  userProfile: any
}

export default function Header({ user, userProfile }: HeaderProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="sr-only">메뉴 열기</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          {/* Page title or breadcrumbs could go here */}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notification Bell */}
          {userProfile?.hospital_id && (
            <NotificationBell hospitalId={userProfile.hospital_id} />
          )}

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="-m-1.5 flex items-center p-1.5 hover:bg-gray-50 rounded-lg">
              <span className="sr-only">사용자 메뉴</span>
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">
                  {userProfile?.full_name || user.email}
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Menu.Button>

            <Menu.Items className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">로그인 정보</p>
                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                {userProfile?.role && (
                  <p className="text-xs text-gray-500 mt-1">
                    권한: {getRoleLabel(userProfile.role)}
                  </p>
                )}
              </div>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } block w-full text-left px-3 py-2 text-sm text-gray-700`}
                  >
                    설정
                  </button>
                )}
              </Menu.Item>

              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`${
                      active ? 'bg-gray-50' : ''
                    } block w-full text-left px-3 py-2 text-sm text-red-600`}
                  >
                    로그아웃
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>
    </div>
  )
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    hospital_owner: '병원 관리자',
    hospital_admin: '병원 어드민',
    marketing_manager: '마케팅 매니저',
    marketing_staff: '마케팅 스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}
