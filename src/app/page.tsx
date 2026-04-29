import MarketingHeader from '@/components/marketing/layout/MarketingHeader'
import MarketingFooter from '@/components/marketing/layout/MarketingFooter'
import HeroSection from '@/components/marketing/sections/HeroSection'
import FeaturesOverview from '@/components/marketing/sections/FeaturesOverview'
import IndustrySection from '@/components/marketing/sections/IndustrySection'
import PricingSection from '@/components/marketing/sections/PricingSection'
import FAQSection from '@/components/marketing/sections/FAQSection'
import FinalCTASection from '@/components/marketing/sections/FinalCTASection'

export const metadata = {
  title: '퍼널리 - DB 마케팅 올인원 플랫폼 | 랜딩페이지, DB 관리, 트래픽 분석',
  description:
    'DB 마케팅은 퍼널리에서 한 번에. 랜딩페이지 제작부터 DB 관리, 트래픽 분석까지 올인원 마케팅 플랫폼. 7일 무료체험.',
  keywords: '마케팅 자동화, 랜딩페이지 빌더, DB 관리, 트래픽 분석, 콜센터, 아웃바운드',
  openGraph: {
    title: '퍼널리 - DB 마케팅 올인원 플랫폼',
    description: '랜딩페이지 제작부터 DB 관리, 트래픽 분석까지. 7일 무료체험.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <HeroSection />
        <FeaturesOverview />
        <IndustrySection />
        <PricingSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
