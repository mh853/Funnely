'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import InquiryModal from '@/components/marketing/modals/InquiryModal'

export default function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setMobileMenuOpen(false)
    }
  }

  return (
    <>
      <InquiryModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        inquiryType="general"
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
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Funnely
                </span>
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
                href="#features"
                onClick={(e) => handleSmoothScroll(e, '#features')}
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                기능
              </a>
              <a
                href="#pricing"
                onClick={(e) => handleSmoothScroll(e, '#pricing')}
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                요금제
              </a>
              <a
                href="#faq"
                onClick={(e) => handleSmoothScroll(e, '#faq')}
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                FAQ
              </a>
            </div>

            {/* CTA buttons */}
            <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 lg:items-center">
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center"
              >
                로그인
              </Link>
              <button
                type="button"
                onClick={() => setIsInquiryOpen(true)}
                className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors inline-flex items-center"
              >
                고객센터
              </button>
              <Link
                href="/auth/signup?plan=pro&trial=true"
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center"
              >
                7일 무료체험
              </Link>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Funnely
                  </span>
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
                      href="#features"
                      onClick={(e) => handleSmoothScroll(e, '#features')}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                    >
                      기능
                    </a>
                    <a
                      href="#pricing"
                      onClick={(e) => handleSmoothScroll(e, '#pricing')}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                    >
                      요금제
                    </a>
                    <a
                      href="#faq"
                      onClick={(e) => handleSmoothScroll(e, '#faq')}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 cursor-pointer"
                    >
                      FAQ
                    </a>
                  </div>
                  <div className="py-6 space-y-4">
                    <Link
                      href="/auth/login"
                      className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      로그인
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setMobileMenuOpen(false); setIsInquiryOpen(true) }}
                      className="block w-full text-left rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      고객센터
                    </button>
                    <Link
                      href="/auth/signup?plan=pro&trial=true"
                      className="block rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-center text-base font-semibold text-white shadow-lg"
                    >
                      7일 무료체험
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
