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
  switch (section.type) {
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

    default:
      return null
  }
}
