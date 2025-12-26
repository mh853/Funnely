'use client'

import ContactHero from '@/components/marketing/contact/ContactHero'
import ContactForm from '@/components/marketing/contact/ContactForm'
import Link from 'next/link'
import { QuestionMarkCircleIcon, BookOpenIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

const quickLinks = [
  {
    name: '자주 묻는 질문',
    description: '일반적인 질문과 답변을 확인하세요',
    href: '/#faq',
    icon: QuestionMarkCircleIcon,
  },
  {
    name: '기능 가이드',
    description: '퍼널리 기능 사용법을 알아보세요',
    href: '/#features',
    icon: BookOpenIcon,
  },
  {
    name: '실시간 채팅',
    description: '긴급한 문의는 실시간 채팅으로',
    href: '#',
    icon: ChatBubbleLeftRightIcon,
    comingSoon: true,
  },
]

export default function ContactPage() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, comingSoon?: boolean) => {
    if (comingSoon) {
      e.preventDefault()
    }
  }

  return (
    <main className="bg-gray-50">
      {/* Hero Section */}
      <ContactHero />

      {/* Contact Form Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ContactForm />
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              빠른 도움이 필요하신가요?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              문의 전에 아래 리소스를 확인해보세요
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`relative rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all hover:scale-105 ${
                  link.comingSoon ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                onClick={(e) => handleClick(e, link.comingSoon)}
              >
                {link.comingSoon && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      준비 중
                    </span>
                  </div>
                )}
                <div className="inline-flex rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-3 shadow-lg mb-4">
                  <link.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {link.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {link.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl mb-4">
              기타 문의 방법
            </h2>
            <div className="space-y-3 text-gray-600">
              <p>
                <strong className="text-gray-900">이메일:</strong>{' '}
                <a href="mailto:support@funnely.com" className="text-blue-600 hover:text-blue-700">
                  support@funnely.com
                </a>
              </p>
              <p>
                <strong className="text-gray-900">운영 시간:</strong> 평일 09:00 - 18:00 (KST)
              </p>
              <p className="text-sm text-gray-500">
                * 주말 및 공휴일 문의는 다음 영업일에 순차적으로 답변드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
