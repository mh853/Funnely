import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFeatureBySlug, getAllFeatureSlugs } from '@/data/features'
import FeatureHero from '@/components/features/detail/FeatureHero'
import KeyBenefits from '@/components/features/detail/KeyBenefits'
import HowItWorks from '@/components/features/detail/HowItWorks'
import FeaturesDetail from '@/components/features/detail/FeaturesDetail'
import UseCases from '@/components/features/detail/UseCases'
import PricingCallout from '@/components/features/detail/PricingCallout'
import RelatedFeatures from '@/components/features/detail/RelatedFeatures'
import FinalCTASection from '@/components/marketing/sections/FinalCTASection'

interface PageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  const slugs = getAllFeatureSlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const feature = getFeatureBySlug(params.slug)

  if (!feature) {
    return {
      title: '페이지를 찾을 수 없습니다',
    }
  }

  return {
    title: `${feature.name} - 퍼널리`,
    description: feature.subtitle,
  }
}

export default function FeatureDetailPage({ params }: PageProps) {
  const feature = getFeatureBySlug(params.slug)

  if (!feature) {
    notFound()
  }

  return (
    <main>
      {/* Hero Section */}
      <FeatureHero
        icon={feature.icon}
        iconGradient={feature.iconGradient}
        title={feature.title}
        subtitle={feature.subtitle}
        isPro={feature.isPro}
      />

      {/* Key Benefits Section */}
      <KeyBenefits benefits={feature.keyBenefits} />

      {/* How It Works Section */}
      <HowItWorks steps={feature.howItWorks} />

      {/* Features Detail Section */}
      <FeaturesDetail features={feature.featuresDetail} />

      {/* Use Cases Section */}
      <UseCases useCases={feature.useCases} />

      {/* Pricing Callout Section */}
      <PricingCallout
        message={feature.pricingCallout.message}
        note={feature.pricingCallout.note}
        isPro={feature.isPro}
      />

      {/* Related Features Section */}
      <RelatedFeatures features={feature.relatedFeatures} />

      {/* Final CTA Section */}
      <FinalCTASection />
    </main>
  )
}
