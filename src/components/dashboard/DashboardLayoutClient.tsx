'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface DashboardLayoutClientProps {
  user: any
  userProfile: any
  children: React.ReactNode
  planFeatures?: { [key: string]: boolean }
  subscriptionBanner?: {
    type: 'trial' | 'trial_ended' | null
    trialEndDate?: string | null
    daysLeft?: number
  }
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function DashboardLayoutClient({
  user,
  userProfile,
  children,
  planFeatures = {},
  subscriptionBanner,
}: DashboardLayoutClientProps) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

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

  const showBanner = !bannerDismissed && subscriptionBanner?.type != null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        userProfile={userProfile}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        planFeatures={planFeatures}
      />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[200px]'}`}>
        {/* 구독 상태 배너 */}
        {showBanner && (
          <div className={`relative px-4 py-3 text-sm font-medium flex items-center justify-between ${
            subscriptionBanner?.type === 'trial_ended'
              ? 'bg-amber-50 border-b border-amber-200 text-amber-800'
              : 'bg-indigo-50 border-b border-indigo-200 text-indigo-800'
          }`}>
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 flex-shrink-0" />
              {subscriptionBanner?.type === 'trial_ended' ? (
                <span>
                  무료 체험이 종료되어 Free 플랜으로 전환되었습니다.{' '}
                  <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="underline font-semibold hover:no-underline"
                  >
                    지금 업그레이드하기 →
                  </button>
                </span>
              ) : (
                <span>
                  무료 체험 중 —{' '}
                  {subscriptionBanner?.daysLeft != null && subscriptionBanner.daysLeft > 0
                    ? `${subscriptionBanner.daysLeft}일 남았습니다.`
                    : '오늘 종료됩니다.'}{' '}
                  <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="underline font-semibold hover:no-underline"
                  >
                    플랜 구독하기 →
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-4 opacity-60 hover:opacity-100"
              aria-label="배너 닫기"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

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
