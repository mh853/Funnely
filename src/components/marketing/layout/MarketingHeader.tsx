'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import InquiryModal from '@/components/marketing/modals/InquiryModal'
import { createClient } from '@/lib/supabase/client'
import { trackCtaClick, trackNavClick } from '@/lib/analytics/ga-events'

// 앵커 해시 → nav_name (노션 46번 §4 권장값)
const NAV_NAME_BY_HASH: Record<string, string> = {
  '#features_0': 'features',
  '#pricing_0': 'pricing',
  '#faq_0': 'faq',
}

export default function MarketingHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) setIsLoggedIn(true)
      })
  }, [])

  // GNB 메뉴 클릭 GA4 이벤트 (노션 46번 §4). 스크롤/이동 처리보다 먼저 호출한다.
  const handleNavClick = (navName: string, destination: string) =>
    trackNavClick({ nav_id: `gnb_${navName}`, nav_name: navName, destination_section: destination })

  // GNB 7일 무료체험은 §11에 따라 nav_click이 아니라 무료체험 CTA(cta_click, button_type trial)로 잡는다
  const handleTrialClick = () =>
    trackCtaClick({
      button_id: 'gnb_free_trial',
      button_name: 'free_trial',
      button_type: 'trial',
      section_id: 'gnb',
      destination_url: '/auth/signup?plan=pro&trial=true',
    })

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    handleNavClick(NAV_NAME_BY_HASH[href], href.replace('#', ''))
    // 홈페이지가 아니면 해당 id가 존재하지 않으므로 스크롤을 가로채지 않고
    // href="/#section" 그대로 홈페이지로 이동시킨다 (도착 후 브라우저가 앵커로 스크롤).
    if (pathname !== '/') return

    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      // history.pushState로만 URL을 갱신 - location.hash를 직접 바꾸면 브라우저가 즉시
      // 점프해버려서 smooth scroll과 충돌한다 (노션 43번)
      history.pushState(null, '', href)
      setMobileMenuOpen(false)
    }
  }

  return (
    <>
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        inquiryType="general"
        leadType="general"
        sectionId="gnb"
      />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto max-w-7xl px-6 lg:px-8" aria-label="Global">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex lg:flex-1">
              <Link href="/" className="-m-1.5 p-1.5">
                <img src="/brand/funnely-logo-horizontal-primary.png" alt="Funnely" className="h-10 w-auto" />
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="sr-only">메뉴 열기</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden lg:flex lg:gap-x-12">
              <a
                href="/#features_0"
                onClick={(e) => handleSmoothScroll(e, '#features_0')}
                className="text-base font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                기능
              </a>
              <a
                href="/#pricing_0"
                onClick={(e) => handleSmoothScroll(e, '#pricing_0')}
                className="text-base font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                요금제
              </a>
              <a
                href="/#faq_0"
                onClick={(e) => handleSmoothScroll(e, '#faq_0')}
                className="text-base font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                FAQ
              </a>
            </div>

            {/* CTA buttons */}
            <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 lg:items-center">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => handleNavClick('dashboard', '/dashboard')}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center"
                >
                  대시보드로 이동
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => handleNavClick('login', '/auth/login')}
                  className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center"
                >
                  로그인
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  handleNavClick('contact', 'inquiry_modal')
                  setIsInquiryOpen(true)
                }}
                className="text-base font-semibold text-gray-700 hover:text-blue-600 transition-colors inline-flex items-center"
              >
                고객센터
              </button>
              {!isLoggedIn && (
                <Link
                  href="/auth/signup?plan=pro&trial=true"
                  onClick={handleTrialClick}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-base font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center"
                >
                  7일 무료체험
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile menu — header 바깥에 위치. header에 backdrop-blur(scrolled 상태)가 걸리면
          backdrop-filter가 fixed 자손의 containing block을 바꿔버려서, header 안에 있으면
          스크롤된 상태에서 열었을 때 뷰포트 기준이 아니라 header의 좁은 박스 기준으로
          포지셔닝되어 화면에 아무것도 안 보이는 버그가 있었다. */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <img src="/brand/funnely-logo-horizontal-primary.png" alt="Funnely" className="h-10 w-auto" />
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">메뉴 닫기</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  <a
                    href="/#features_0"
                    onClick={(e) => handleSmoothScroll(e, '#features_0')}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                  >
                    기능
                  </a>
                  <a
                    href="/#pricing_0"
                    onClick={(e) => handleSmoothScroll(e, '#pricing_0')}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                  >
                    요금제
                  </a>
                  <a
                    href="/#faq_0"
                    onClick={(e) => handleSmoothScroll(e, '#faq_0')}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                  >
                    FAQ
                  </a>
                </div>
                <div className="py-6 space-y-4">
                  {isLoggedIn ? (
                    <Link
                      href="/dashboard"
                      onClick={() => handleNavClick('dashboard', '/dashboard')}
                      className="block rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-center text-base font-semibold text-white shadow-lg"
                    >
                      대시보드로 이동
                    </Link>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => handleNavClick('login', '/auth/login')}
                      className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      로그인
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleNavClick('contact', 'inquiry_modal')
                      setMobileMenuOpen(false)
                      setIsInquiryOpen(true)
                    }}
                    className="block w-full text-left rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    고객센터
                  </button>
                  {!isLoggedIn && (
                    <Link
                      href="/auth/signup?plan=pro&trial=true"
                      onClick={handleTrialClick}
                      className="block rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-center text-base font-semibold text-white shadow-lg"
                    >
                      7일 무료체험
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
