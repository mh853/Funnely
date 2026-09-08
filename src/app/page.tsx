import MarketingHeader from '@/components/marketing/layout/MarketingHeader'
import MarketingFooter from '@/components/marketing/layout/MarketingFooter'
import HeroSection from '@/components/marketing/sections/HeroSection'
import FeaturesOverview from '@/components/marketing/sections/FeaturesOverview'
import FeatureShowcase from '@/components/marketing/sections/FeatureShowcase'
import IndustrySection from '@/components/marketing/sections/IndustrySection'
import PricingSection from '@/components/marketing/sections/PricingSection'
import FAQSection from '@/components/marketing/sections/FAQSection'
import FinalCTASection from '@/components/marketing/sections/FinalCTASection'
import { config } from '@/lib/config'

export const metadata = {
  title: '퍼널리 - DB 마케팅 올인원 플랫폼 | 랜딩페이지, DB 관리, 트래픽 분석',
  description:
    'DB 마케팅은 퍼널리에서 한 번에. 랜딩페이지 제작부터 DB 관리, 트래픽 분석까지 올인원 마케팅 플랫폼. 7일 무료체험.',
  keywords: '마케팅 자동화, 랜딩페이지 빌더, DB 관리, 트래픽 분석, 콜센터, 아웃바운드',
  alternates: { canonical: '/' },
  openGraph: {
    title: '퍼널리 - DB 마케팅 올인원 플랫폼',
    description: '랜딩페이지 제작부터 DB 관리, 트래픽 분석까지. 7일 무료체험.',
    url: '/',
    type: 'website',
    siteName: '퍼널리',
    locale: 'ko_KR',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const SITE_URL = config.app.domain

// 구글 리치 결과용 구조화 데이터 (노션 35번). 사업자 정보는 푸터에 이미 공개된 config.business 재사용.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: '퍼널리',
  alternateName: 'Funnely',
  legalName: config.business.name,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/funnely-symbol-primary.png`,
  email: config.business.email,
  telephone: config.business.phone,
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'KR',
    addressRegion: '경기도',
    addressLocality: '화성시',
    streetAddress: '남양읍 고향의봄길 36 104동 303호',
  },
}

// 가격 범위는 PricingSection 하드코딩 값 및 DB subscription_plans 활성 플랜과 일치(2026-09-08 확인).
// 요금 변경 시 PricingSection과 함께 갱신할 것.
const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '퍼널리',
  url: SITE_URL,
  description:
    '랜딩페이지 제작부터 DB 관리, 트래픽 분석까지 한 곳에서 처리하는 DB 마케팅 올인원 플랫폼',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'KRW',
    lowPrice: 19000,
    highPrice: 490000,
    offerCount: 4,
    url: `${SITE_URL}/#pricing`,
  },
  publisher: { '@id': `${SITE_URL}/#organization` },
}

// JSON 문자열 안의 '<'를 이스케이프해 </script> 조기 종료를 막는다
const toJsonLd = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(softwareApplicationJsonLd) }}
      />
      <MarketingHeader />
      <main>
        <HeroSection />
        <FeaturesOverview />
        <FeatureShowcase />
        <IndustrySection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
