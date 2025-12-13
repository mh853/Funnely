'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutClientProps {
  user: any
  userProfile: any
  children: React.ReactNode
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function DashboardLayoutClient({
  user,
  userProfile,
  children,
}: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // localStorage에서 사이드바 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  // 사이드바 상태 토글 및 저장
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        userProfile={userProfile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-52'}`}>
        <Header
          user={user}
          userProfile={userProfile}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="py-6">
          <div className="mx-auto max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
