import Link from 'next/link'

const navigation = {
  product: [
    { name: '랜딩페이지 빌더', href: '#features' },
    { name: 'DB 관리', href: '#features' },
    { name: '트래픽 분석', href: '#features' },
    { name: 'DB 리포트', href: '#features' },
    { name: '스케줄 관리', href: '#features' },
    { name: '요금제', href: '#pricing' },
  ],
  company: [
    { name: '회사 소개', href: '#' },
    { name: '블로그', href: '#' },
    { name: '고객 사례', href: '#' },
    { name: '채용', href: '#' },
  ],
  support: [
    { name: '고객 지원', href: '#' },
    { name: 'FAQ', href: '#faq' },
    { name: '가이드', href: '#' },
    { name: '문의하기', href: '/contact' },
  ],
  legal: [
    { name: '개인정보처리방침', href: '#' },
    { name: '이용약관', href: '#' },
  ],
}

export default function MarketingFooter() {
  return (
    <footer className="bg-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Funnely
            </span>
            <p className="text-sm leading-6 text-gray-400">
              비즈니스 성장을 위한 올인원 플랫폼
            </p>
            <div className="flex space-x-6">
              {/* 소셜 미디어 아이콘 - 추후 추가 가능 */}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">제품</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.product.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm leading-6 text-gray-400 hover:text-white transition-colors"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">회사</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm leading-6 text-gray-400 hover:text-white transition-colors"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">지원</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.support.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-gray-400 hover:text-white transition-colors"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">법률</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm leading-6 text-gray-400 hover:text-white transition-colors"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-gray-800 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-400">
            &copy; 2025 Funnely. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
