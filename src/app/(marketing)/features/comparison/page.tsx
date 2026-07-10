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
    question: '무료로 체험할 수 있는 플랜이 있나요?',
    answer: '네, 프로 플랜(₩290,000/월)은 신용카드 등록 없이 7일간 무료로 체험할 수 있습니다. 체험 기간 동안 프로 플랜의 모든 기능을 제한 없이 사용할 수 있습니다.',
  },
  {
    question: '체험 기간이 끝나면 어떻게 되나요?',
    answer: '체험 기간 중 카드를 등록하면 자동으로 유료 구독이 시작됩니다. 카드를 등록하지 않으면 체험 종료 후 대시보드 접근이 제한되며, 요금제를 선택하면 바로 다시 이용할 수 있습니다.',
  },
  {
    question: '플랜을 업그레이드하거나 다운그레이드할 수 있나요?',
    answer: '네, 언제든지 다른 플랜으로 변경할 수 있습니다. 변경 즉시 새 플랜의 기능이 적용되며, 기존 데이터는 모두 유지됩니다.',
  },
  {
    question: '고객 지원은 어떻게 받을 수 있나요?',
    answer: '모든 플랜에서 이메일 지원을 받을 수 있으며, 프로 플랜 이상부터는 우선 지원이 제공됩니다.',
  },
  {
    question: '관리자 계정 수 제한은 어떻게 되나요?',
    answer: '스타터·스타터 플러스는 1명, 프로는 10명까지 관리자 계정을 추가할 수 있으며, 프리미엄은 무제한입니다.',
  },
  {
    question: '연간 결제 시 할인이 있나요?',
    answer: '네, 연간 결제를 선택하면 월간 결제 대비 약 10% 할인된 금액으로 이용할 수 있습니다.',
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
