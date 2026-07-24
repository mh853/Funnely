// 어드민 레이아웃의 모바일 메뉴 상태(햄버거 토글/사이드바 열림 여부)를 관리하는 클라이언트 컴포넌트
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import AdminNav from './AdminNav'
import NotificationBell from './NotificationBell'

interface AdminLayoutClientProps {
  user: { name: string; email: string }
  children: React.ReactNode
}

export default function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav user={user} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
          <div className="px-4 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="sr-only">메뉴 열기</span>
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
              {/* Indigo accent bar */}
              <div className="hidden sm:block w-0.5 h-6 bg-gradient-to-b from-indigo-600 to-blue-400 rounded-full" />
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">퍼널리 어드민</h1>
                <p className="text-[11px] text-gray-400 hidden sm:block">시스템 전체 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-[11px] text-indigo-500 font-medium">슈퍼 어드민</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  )
}
