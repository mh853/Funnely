import { Metadata } from 'next'
import ComparisonHero from '@/components/features/comparison/ComparisonHero'
import ComparisonCards from '@/components/features/comparison/ComparisonCards'
import ComparisonFAQ from '@/components/features/comparison/ComparisonFAQ'
import FinalCTASection from '@/components/marketing/sections/FinalCTASection'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionPlan } from '@/types/subscription'

export const metadata: Metadata = {
  title: '기능 비교표 - 퍼널리',
  description: '모든 플랜의 기능을 한눈에 비교하세요. 비즈니스 성장에 맞는 최적의 플랜을 선택하세요.',
}

async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient()

  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch subscription plans:', error)
    return []
  }

  return plans || []
}

const faqs = [
  {
    question: '무료 플랜에서 프로 플랜으로 업그레이드할 수 있나요?',
    answer: '네, 언제든지 프로 플랜으로 업그레이드할 수 있습니다. 업그레이드 즉시 모든 프로 기능을 사용할 수 있으며, 기존 데이터는 모두 유지됩니다.',
  },
  {
    question: '프로 플랜을 14일 동안 무료로 체험할 수 있나요?',
    answer: '네, 신용카드 등록 없이 14일 동안 프로 플랜의 모든 기능을 무료로 체험할 수 있습니다. 체험 기간 종료 후 자동으로 무료 플랜으로 전환됩니다.',
  },
  {
    question: '플랜을 다운그레이드하면 데이터는 어떻게 되나요?',
    answer: '프로 플랜에서 무료 플랜으로 다운그레이드하면 무료 플랜 제한(리드 1,000개, 페이지 3개 등)을 초과하는 데이터는 읽기 전용으로 유지됩니다. 새로운 데이터 추가는 제한 내에서만 가능합니다.',
  },
  {
    question: '무료 플랜에도 고객 지원이 제공되나요?',
    answer: '네, 무료 플랜에도 이메일 지원이 제공됩니다. 프로 플랜에서는 우선 지원과 실시간 채팅 지원이 추가로 제공됩니다.',
  },
  {
    question: '팀원 수 제한은 어떻게 되나요?',
    answer: '무료 플랜은 최대 3명, 프로 플랜은 무제한입니다. 프로 플랜에서는 팀원당 추가 비용 없이 무제한으로 초대할 수 있습니다.',
  },
  {
    question: '연간 결제 시 할인이 있나요?',
    answer: '네, 연간 결제 시 월간 결제 대비 20% 할인이 적용됩니다. 예를 들어 프로 플랜 월간 ₩49,000 → 연간 ₩470,400 (2개월 무료)입니다.',
  },
]

export default async function ComparisonPage() {
  const plans = await getSubscriptionPlans()

  return (
    <main>
      {/* Hero Section */}
      <ComparisonHero />

      {/* Plan Cards Section */}
      <ComparisonCards plans={plans} />

      {/* FAQ Section */}
      <ComparisonFAQ faqs={faqs} />

      {/* Final CTA Section */}
      <FinalCTASection />
    </main>
  )
}
