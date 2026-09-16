'use client'
// 홈페이지 섹션 노출(section_view) 측정 + 옛 앵커 해시(#features 등) → 새 id(features_0) 호환 처리 (노션 46번)

import { useEffect, useRef } from 'react'
import { GA_SECTIONS, trackSectionView } from '@/lib/analytics/ga-events'

// 노션 46번 §2 이전에 쓰이던 앵커. 43번으로 해시가 URL에 남게 된 뒤 공유된 링크가 계속 동작하도록 유지.
const LEGACY_HASH_MAP: Record<string, string> = {
  hero: 'hero_0',
  features: 'features_0',
  'feature-landing': 'features_1',
  'feature-db': 'features_2',
  'feature-analytics': 'features_3',
  'feature-schedule': 'features_4',
  'feature-pixel': 'features_5',
  industry: 'industry_0',
  pricing: 'pricing_0',
  faq: 'faq_0',
  'final-cta': 'cta_0',
}

// 노션 46번 §3: 섹션 50% 이상 노출 + 약 1초 유지 + 같은 페이지 로드에서 section_id당 1회.
// 모바일에서 뷰포트보다 훨씬 큰 섹션(hero, 기능 상세 블록)은 50%가 절대 안 보이므로
// "섹션의 50%" 또는 "뷰포트 높이의 50% 이상을 차지" 중 하나면 노출로 본다.
const VISIBLE_RATIO = 0.5
const DWELL_MS = 1000
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20)

export default function SectionViewTracker() {
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // 옛 해시로 진입한 경우 새 id로 바꾸고 해당 섹션으로 스크롤
    const legacy = window.location.hash.replace('#', '')
    const mapped = LEGACY_HASH_MAP[legacy]
    if (mapped) {
      history.replaceState(null, '', `#${mapped}`)
      document.getElementById(mapped)?.scrollIntoView()
    }

    const fired = firedRef.current
    const timers = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          const section = GA_SECTIONS.find((s) => s.id === id)
          if (!section || fired.has(id)) continue

          const visibleEnough =
            entry.isIntersecting &&
            (entry.intersectionRatio >= VISIBLE_RATIO ||
              entry.intersectionRect.height >= window.innerHeight * VISIBLE_RATIO)

          if (visibleEnough) {
            if (timers.has(id)) continue
            timers.set(
              id,
              window.setTimeout(() => {
                timers.delete(id)
                if (fired.has(id)) return
                fired.add(id)
                trackSectionView(section)
                observer.unobserve(entry.target)
              }, DWELL_MS)
            )
          } else {
            const t = timers.get(id)
            if (t !== undefined) {
              clearTimeout(t)
              timers.delete(id)
            }
          }
        }
      },
      { threshold: THRESHOLDS }
    )

    for (const section of GA_SECTIONS) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }

    return () => {
      observer.disconnect()
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return null
}
