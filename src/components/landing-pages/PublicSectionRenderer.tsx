'use client'

import { Section } from '@/types/landing-page.types'
import HeroSection from './sections/HeroSection'
import FeaturesSection from './sections/FeaturesSection'
import FormSection from './sections/FormSection'
import TestimonialsSection from './sections/TestimonialsSection'
import CtaSection from './sections/CtaSection'
import TimerSection from './sections/TimerSection'
import FaqSection from './sections/FaqSection'
import PricingSection from './sections/PricingSection'

interface PublicSectionRendererProps {
  section: Section
  themeColors: {
    primary: string
    secondary: string
  }
  landingPageId: string
}

export default function PublicSectionRenderer({
  section,
  themeColors,
  landingPageId,
}: PublicSectionRendererProps) {
  // enabled가 false인 섹션은 렌더링하지 않음
  if (section.props?.enabled === false) return null

  switch (section.type) {
    // 기존 타입 (하위 호환성)
    case 'hero':
      return <HeroSection section={section} themeColors={themeColors} />

    case 'features':
      return <FeaturesSection section={section} themeColors={themeColors} />

    case 'form':
      return <FormSection section={section} themeColors={themeColors} landingPageId={landingPageId} />

    case 'testimonials':
      return <TestimonialsSection section={section} themeColors={themeColors} />

    case 'cta':
      return <CtaSection section={section} themeColors={themeColors} />

    case 'timer':
      return <TimerSection section={section} themeColors={themeColors} />

    case 'faq':
      return <FaqSection section={section} themeColors={themeColors} />

    case 'pricing':
      return <PricingSection section={section} themeColors={themeColors} />

    // 새로운 타입 매핑
    case 'hero_image':
      return <HeroSection section={section} themeColors={themeColors} />

    case 'description':
      // 설명 섹션은 히어로 섹션의 일부로 처리
      return null

    case 'realtime_status':
      // 실시간 현황은 추후 구현
      return null

    case 'privacy_consent':
      // 개인정보 동의는 폼 섹션에 포함
      return null

    case 'cta_button':
      return <CtaSection section={section} themeColors={themeColors} />

    case 'call_button':
      // 전화 버튼은 고정 위치 버튼으로 별도 처리 필요
      return null

    default:
      return null
  }
}
