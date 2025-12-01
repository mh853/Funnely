'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
} from '@heroicons/react/24/outline'

interface SidebarProps {
  userProfile: any
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: HomeIcon },
  { name: 'DB 현황', href: '/dashboard/leads', icon: PhoneIcon },
  { name: 'DB 스케줄', href: '/dashboard/calendar', icon: CalendarIcon },
  { name: '예약 스케줄', href: '/dashboard/reservations', icon: CalendarIcon },
  { name: '랜딩 페이지', href: '/dashboard/landing-pages', icon: GlobeAltIcon },
  { name: '캠페인', href: '/dashboard/campaigns', icon: MegaphoneIcon },
  { name: '광고 계정', href: '/dashboard/ad-accounts', icon: ChartBarIcon },
  { name: '분석', href: '/dashboard/analytics', icon: PresentationChartLineIcon },
  { name: '리포트', href: '/dashboard/reports', icon: DocumentTextIcon },
  { name: '구독 관리', href: '/dashboard/subscription', icon: CreditCardIcon },
  { name: '결제 내역', href: '/dashboard/payments', icon: CurrencyDollarIcon },
  { name: '팀 관리', href: '/dashboard/team', icon: UsersIcon },
  { name: '설정', href: '/dashboard/settings', icon: CogIcon },
]

export default function Sidebar({ userProfile, mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname()

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-2xl font-bold text-blue-600">Funnely</h1>
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
            </li>
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
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>
    </>
  )
}
