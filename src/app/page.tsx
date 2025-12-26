import MarketingHeader from '@/components/marketing/layout/MarketingHeader'
import MarketingFooter from '@/components/marketing/layout/MarketingFooter'
import HeroSection from '@/components/marketing/sections/HeroSection'
import FeaturesOverview from '@/components/marketing/sections/FeaturesOverview'
import PricingSection from '@/components/marketing/sections/PricingSection'
import FAQSection from '@/components/marketing/sections/FAQSection'
import FinalCTASection from '@/components/marketing/sections/FinalCTASection'

export const metadata = {
  title: '퍼널리 - 비즈니스 성장 올인원 플랫폼 | 랜딩페이지, 리드 관리, 분석',
  description:
    '비즈니스 성장에 필요한 모든 것. 랜딩페이지 제작부터 리드 관리, 트래픽 분석까지 한 곳에서. 14일 무료 체험.',
  keywords: '마케팅 자동화, 랜딩페이지 빌더, 리드 관리, 트래픽 분석, CRM, 비즈니스 성장',
  openGraph: {
    title: '퍼널리 - 비즈니스 성장 올인원 플랫폼',
    description: '랜딩페이지 제작부터 리드 관리, 분석까지 월 5만원으로 해결',
    type: 'website',
  },
}

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <HeroSection />
        <FeaturesOverview />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
