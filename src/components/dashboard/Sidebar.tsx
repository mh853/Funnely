'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  ChartBarIcon,
  CogIcon,
  UsersIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  PhoneIcon,
  CalendarIcon,
  PresentationChartLineIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import UpgradePromptModal from '@/components/modals/UpgradePromptModal'

interface SidebarProps {
  userProfile: any
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  planFeatures?: { [key: string]: boolean } // 플랜별 기능 권한
}

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: HomeIcon, requiredFeature: 'dashboard' },
  { name: 'DB 현황', href: '/dashboard/leads', icon: PhoneIcon, requiredFeature: 'db_status' },
  { name: 'DB 스케줄', href: '/dashboard/calendar', icon: CalendarIcon, requiredFeature: 'db_schedule' },
  { name: '예약 스케줄', href: '/dashboard/reservations', icon: CalendarIcon, requiredFeature: 'reservation_schedule' },
  { name: '랜딩 페이지', href: '/dashboard/landing-pages', icon: GlobeAltIcon, requiredFeature: 'dashboard' },
  // [임시 비활성화] 캠페인, 광고 계정 - 나중에 복원 시 주석 해제
  // { name: '캠페인', href: '/dashboard/campaigns', icon: MegaphoneIcon },
  // { name: '광고 계정', href: '/dashboard/ad-accounts', icon: ChartBarIcon },
  { name: '트래픽 분석', href: '/dashboard/analytics', icon: PresentationChartLineIcon, requiredFeature: 'analytics' },
  { name: 'DB 리포트', href: '/dashboard/reports', icon: DocumentTextIcon, requiredFeature: 'reports' },
  { name: '기술 지원', href: '/dashboard/support', icon: ChatBubbleLeftRightIcon, requiredFeature: 'dashboard' },
  // [설정 페이지로 통합] 구독 관리, 결제 내역, 팀 관리
  // { name: '구독 관리', href: '/dashboard/subscription', icon: CreditCardIcon },
  // { name: '결제 내역', href: '/dashboard/payments', icon: CurrencyDollarIcon },
  // { name: '팀 관리', href: '/dashboard/team', icon: UsersIcon },
  { name: '설정', href: '/dashboard/settings', icon: CogIcon, requiredFeature: 'dashboard' },
  { name: 'DB 블랙리스트', href: '/dashboard/blacklist', icon: ShieldExclamationIcon, requiredFeature: 'dashboard' },
]

export default function Sidebar({ userProfile, mobileMenuOpen, setMobileMenuOpen, collapsed = false, onToggleCollapse, planFeatures = {} }: SidebarProps) {
  const pathname = usePathname()
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<'트래픽 분석' | 'DB 리포트' | 'DB 스케줄' | '예약 스케줄'>('트래픽 분석')

  // 디버깅: planFeatures 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [Sidebar] Received planFeatures:', planFeatures)
    console.log('📱 [Sidebar] User profile:', userProfile?.email, userProfile?.company_id)
  }

  // Feature name mapping
  const featureNameMap: { [key: string]: '트래픽 분석' | 'DB 리포트' | 'DB 스케줄' | '예약 스케줄' } = {
    'analytics': '트래픽 분석',
    'reports': 'DB 리포트',
    'db_schedule': 'DB 스케줄',
    'reservation_schedule': '예약 스케줄'
  }

  // 플랜 기능에 따라 메뉴 비활성화 처리 (필터링하지 않고 모두 표시)
  const processedNavigation = navigation.map(item => ({
    ...item,
    disabled: item.requiredFeature ? planFeatures[item.requiredFeature] !== true : false,
    disabledReason: item.requiredFeature && planFeatures[item.requiredFeature] !== true
      ? '프로 플랜 이상 필요 (클릭하면 업그레이드)'
      : undefined
  }))

  // 디버깅: processedNavigation 확인
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [Sidebar] Processed navigation:', processedNavigation.map(item => ({
      name: item.name,
      requiredFeature: item.requiredFeature,
      featureValue: item.requiredFeature ? planFeatures[item.requiredFeature] : 'N/A',
      disabled: item.disabled
    })))
  }

  const handleDisabledClick = (e: React.MouseEvent, requiredFeature: string) => {
    e.preventDefault()
    const featureName = featureNameMap[requiredFeature]
    if (featureName) {
      setSelectedFeature(featureName)
      setUpgradeModalOpen(true)
    }
  }

  // 접힌 상태의 사이드바 콘텐츠
  const CollapsedSidebarContent = () => (
    <div className="flex grow flex-col gap-y-3 overflow-y-auto bg-white border-r border-gray-200 px-3 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-center">
        <h1 className="text-xl font-bold text-blue-600">F</h1>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-colors"
        title="사이드바 펼치기"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>

      {/* Navigation - Icons Only */}
      <nav className="flex flex-col">
        <ul role="list" className="space-y-1">
          {processedNavigation.map((item) => {
            const isActive = pathname === item.href
            const isDisabled = item.disabled

            if (isDisabled) {
              return (
                <li key={item.name} className="relative group">
                  <button
                    onClick={(e) => item.requiredFeature && handleDisabledClick(e, item.requiredFeature)}
                    title={item.disabledReason}
                    className="w-full group flex items-center justify-center rounded-md p-2 text-gray-300 hover:text-gray-400 hover:bg-gray-50 cursor-not-allowed opacity-50 transition-all"
                  >
                    <item.icon className="h-6 w-6 shrink-0 text-gray-300" aria-hidden="true" />
                    <LockClosedIcon className="h-3 w-3 absolute top-1 right-1 text-gray-400" />
                  </button>
                </li>
              )
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  prefetch={true}
                  title={item.name}
                  className={`
                    group flex items-center justify-center rounded-md p-2
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
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )

  // 펼쳐진 상태의 사이드바 콘텐츠
  const ExpandedSidebarContent = ({ showToggle = true }: { showToggle?: boolean }) => (
    <div className="flex grow flex-col gap-y-3 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
      {/* Logo & Toggle */}
      <div className="flex h-16 shrink-0 items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">Funnely</h1>
        {showToggle && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            title="사이드바 접기"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Hospital Info */}
      {userProfile?.companies && (
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-gray-600">회사</p>
          <p className="font-medium text-gray-900 truncate">
            {userProfile.companies.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col">
        <ul role="list" className="-mx-2 space-y-1">
          {processedNavigation.map((item) => {
            const isActive = pathname === item.href
            const isDisabled = item.disabled

            if (isDisabled) {
              return (
                <li key={item.name} className="relative group">
                  <button
                    onClick={(e) => {
                      if (item.requiredFeature) {
                        handleDisabledClick(e, item.requiredFeature)
                      }
                    }}
                    title={item.disabledReason}
                    className="w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-300 hover:text-gray-400 hover:bg-gray-50 cursor-not-allowed opacity-50 transition-all"
                  >
                    <div className="relative">
                      <item.icon className="h-6 w-6 shrink-0 text-gray-300" aria-hidden="true" />
                      <LockClosedIcon className="h-3 w-3 absolute -top-1 -right-1 text-gray-400" />
                    </div>
                    {item.name}
                  </button>
                  {/* Tooltip on hover */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {item.disabledReason}
                  </div>
                </li>
              )
            }

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
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
      </nav>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="sr-only">사이드바 닫기</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <ExpandedSidebarContent showToggle={false} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-[200px]'}`}>
        {collapsed ? <CollapsedSidebarContent /> : <ExpandedSidebarContent />}
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={selectedFeature}
      />
    </>
  )
}
