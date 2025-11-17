'use client'

import { LandingPage } from '@/types/landing-page.types'
import PublicSectionRenderer from './PublicSectionRenderer'

interface PublicLandingPageProps {
  landingPage: LandingPage
}

export default function PublicLandingPage({ landingPage }: PublicLandingPageProps) {
  const { sections, theme } = landingPage

  return (
    <div className="min-h-screen">
      {sections.map((section) => (
        <PublicSectionRenderer
          key={section.id}
          section={section}
          themeColors={theme.colors}
          landingPageId={landingPage.id}
        />
      ))}
    </div>
  )
}
