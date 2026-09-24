'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import TrialExpiredModal from './TrialExpiredModal'
import GuideModal from './GuideModal'

// Toss 결제 리다이렉트 페이지: 자체적으로 전체화면 UI를 그리므로 사이드바/헤더 없이 렌더링
const FULLSCREEN_PATHS = [
  '/dashboard/subscription/billing-success',
  '/dashboard/subscription/billing-fail',
]

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
  trialDDay?: string | null
  // 퍼널리 Meta 앱 환경변수가 설정된 경우에만 '광고 성과' 메뉴를 보여준다
  showAdPerformance?: boolean
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'
const GUIDE_DISMISSED_KEY_PREFIX = 'funnely-guide-dismissed-'
// X로 닫은 것은 브라우저 세션 동안만 기억 (새로고침·URL 직접 이동으로 레이아웃이 다시 마운트돼도 재등장 방지)
const GUIDE_CLOSED_SESSION_KEY_PREFIX = 'funnely-guide-closed-'

export default function DashboardLayoutClient({
  user,
  userProfile,
  children,
  planFeatures = {},
  subscriptionBanner,
  subscriptionStatus,
  currentPlanName,
  trialDDay,
  showAdPerformance = false,
}: DashboardLayoutClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [trialModalDismissed, setTrialModalDismissed] = useState(false)
  const [guideModalOpen, setGuideModalOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  // 이 사용자가 가이드를 아직 "다시 보지 않기"로 닫은 적이 없으면 첫 접속 시 자동으로 띄운다
  useEffect(() => {
    if (!user?.id) return
    const dismissed = localStorage.getItem(GUIDE_DISMISSED_KEY_PREFIX + user.id)
    const closedThisSession = sessionStorage.getItem(GUIDE_CLOSED_SESSION_KEY_PREFIX + user.id)
    if (!dismissed && !closedThisSession) {
      setGuideModalOpen(true)
    }
  }, [user?.id])

  const closeGuideForSession = () => {
    if (user?.id) {
      sessionStorage.setItem(GUIDE_CLOSED_SESSION_KEY_PREFIX + user.id, '1')
    }
    setGuideModalOpen(false)
  }

  const dismissGuideForever = () => {
    if (user?.id) {
      localStorage.setItem(GUIDE_DISMISSED_KEY_PREFIX + user.id, '1')
    }
    setGuideModalOpen(false)
  }

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
  }

  if (FULLSCREEN_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  const showTrialExpiredModal =
    !trialModalDismissed && subscriptionBanner?.type === 'trial_ended'
  // 체험 종료 모달이 떠 있는 동안은 가이드 팝업을 같이 띄우지 않는다 (모달 중첩 방지)
  const showGuideModal = guideModalOpen && !showTrialExpiredModal

  return (
    <div className="min-h-screen bg-gray-50">
      {showTrialExpiredModal && (
        <TrialExpiredModal onDismiss={() => setTrialModalDismissed(true)} />
      )}
      {showGuideModal && (
        <GuideModal onClose={closeGuideForSession} onDismissForever={dismissGuideForever} />
      )}
      <Sidebar
        userProfile={userProfile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        planFeatures={planFeatures}
        subscriptionStatus={subscriptionStatus}
        showAdPerformance={showAdPerformance}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[200px]'}`}>
        <Header
          user={user}
          userProfile={userProfile}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentPlanName={currentPlanName}
          trialDDay={trialDDay}
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
