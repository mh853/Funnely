'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import TrialExpiredModal from './TrialExpiredModal'

interface DashboardLayoutClientProps {
  user: any
  userProfile: any
  children: React.ReactNode
  planFeatures?: { [key: string]: boolean }
  subscriptionBanner?: {
    type: 'trial_ended' | null
  }
  subscriptionStatus?: string | null
  currentPlanName?: string | null
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function DashboardLayoutClient({
  user,
  userProfile,
  children,
  planFeatures = {},
  subscriptionBanner,
  subscriptionStatus,
  currentPlanName,
}: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [trialModalDismissed, setTrialModalDismissed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  const showTrialExpiredModal =
    !trialModalDismissed && subscriptionBanner?.type === 'trial_ended'

  return (
    <div className="min-h-screen bg-gray-50">
      {showTrialExpiredModal && (
        <TrialExpiredModal onDismiss={() => setTrialModalDismissed(true)} />
      )}
      <Sidebar
        userProfile={userProfile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        planFeatures={planFeatures}
        subscriptionStatus={subscriptionStatus}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[200px]'}`}>
        <Header
          user={user}
          userProfile={userProfile}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentPlanName={currentPlanName}
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
