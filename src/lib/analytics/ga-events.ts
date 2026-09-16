// 노션 46번 GA4 정밀 분석용 dataLayer 이벤트 헬퍼 - 공통 이벤트 + 파라미터 구조(section_view/nav_click/cta_click 등)
// 각 헬퍼는 해당 이벤트의 전체 파라미터 셋을 항상 push한다. 값이 없으면 undefined를 명시해
// GTM dataLayer 모델에 남아있는 직전 push의 값이 다음 이벤트에 섞여 들어가는 것을 막는다.
// (GA4 이벤트 태그는 undefined 파라미터를 전송하지 않는다.) 개인정보는 어떤 이벤트에도 담지 않는다.
'use client'

import { trackEvent } from './track'

export type BillingCycle = 'monthly' | 'annual'

// 노션 46번 §3 권장 매핑. 앵커 id(section_id)와 1:1.
export const GA_SECTIONS = [
  { id: 'hero_0', name: 'hero', group: 'hero' },
  { id: 'features_0', name: 'features_overview', group: 'features' },
  { id: 'features_1', name: 'landing_page_builder', group: 'features' },
  { id: 'features_2', name: 'db_management', group: 'features' },
  { id: 'features_3', name: 'traffic_analytics', group: 'features' },
  { id: 'features_4', name: 'schedule_management', group: 'features' },
  { id: 'features_5', name: 'pixel_api', group: 'features' },
  { id: 'industry_0', name: 'industry', group: 'industry' },
  { id: 'pricing_0', name: 'pricing', group: 'pricing' },
  { id: 'faq_0', name: 'faq', group: 'faq' },
  { id: 'cta_0', name: 'final_cta', group: 'cta' },
  { id: 'footer_0', name: 'footer', group: 'footer' },
] as const

export function trackSectionView(section: (typeof GA_SECTIONS)[number]): void {
  trackEvent({
    event: 'section_view',
    section_id: section.id,
    section_name: section.name,
    section_group: section.group,
  })
}

export function trackNavClick(p: { nav_id: string; nav_name: string; destination_section: string }): void {
  trackEvent({
    event: 'nav_click',
    nav_id: p.nav_id,
    nav_name: p.nav_name,
    destination_section: p.destination_section,
  })
}

export function trackCtaClick(p: {
  button_id: string
  button_name: string
  button_type: string
  section_id: string
  destination_url?: string
}): void {
  trackEvent({
    event: 'cta_click',
    button_id: p.button_id,
    button_name: p.button_name,
    button_type: p.button_type,
    section_id: p.section_id,
    destination_url: p.destination_url,
  })
}

export function trackIndustrySelect(p: { industry_name: string; section_id: string }): void {
  trackEvent({ event: 'industry_select', industry_name: p.industry_name, section_id: p.section_id })
}

export function trackSelectPlan(p: { plan_name: string; billing_cycle: BillingCycle; section_id: string }): void {
  trackEvent({
    event: 'select_plan',
    plan_name: p.plan_name,
    billing_cycle: p.billing_cycle,
    section_id: p.section_id,
  })
}

export function trackBillingCycleChange(p: { billing_cycle: BillingCycle; section_id: string }): void {
  trackEvent({ event: 'billing_cycle_change', billing_cycle: p.billing_cycle, section_id: p.section_id })
}

export function trackFaqOpen(p: { faq_id: string; faq_name: string; section_id: string }): void {
  trackEvent({ event: 'faq_open', faq_id: p.faq_id, faq_name: p.faq_name, section_id: p.section_id })
}

// 실제 상담/문의 폼 제출이 서버에서 성공한 시점에만 1회 호출할 것 (버튼 클릭은 cta_click).
export function trackGenerateLead(p: { lead_type: string; section_id?: string }): void {
  trackEvent({ event: 'generate_lead', lead_type: p.lead_type, section_id: p.section_id })
}

export function trackBeginCheckout(p: {
  plan_name: string | null
  billing_cycle: BillingCycle
  value: number
  extra?: Record<string, unknown>
}): void {
  trackEvent({
    event: 'begin_checkout',
    plan_name: p.plan_name,
    billing_cycle: p.billing_cycle,
    value: p.value,
    currency: 'KRW',
    ...p.extra,
  })
}

// 결제 성공이 서버에서 확인된 뒤에만, 같은 transaction_id로는 1회만 호출할 것.
export function trackPurchase(p: {
  transaction_id: string
  plan_name: string | null
  billing_cycle: BillingCycle
  value: number
  extra?: Record<string, unknown>
}): void {
  trackEvent({
    event: 'purchase',
    transaction_id: p.transaction_id,
    plan_name: p.plan_name,
    billing_cycle: p.billing_cycle,
    value: p.value,
    currency: 'KRW',
    ...p.extra,
  })
}

export function trackTrialStart(p: { plan_name: string; trial_days: number; extra?: Record<string, unknown> }): void {
  trackEvent({ event: 'trial_start', plan_name: p.plan_name, trial_days: p.trial_days, ...p.extra })
}

export function trackLogin(p: { method: string }): void {
  trackEvent({ event: 'login', method: p.method })
}
