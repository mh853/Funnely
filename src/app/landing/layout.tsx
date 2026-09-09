// 레거시 랜딩페이지 경로(/landing/[slug], /landing?ref=) 공통 레이아웃 - 검색엔진 색인 제외(noindex) (노션 37번)
import type { Metadata } from 'next'

// funnely.co.kr/landing/xxxxx 형태로 직접 렌더링되는 레거시 경로. 서브도메인 경로
// (src/app/[companyShortId]/layout.tsx)와 같은 이유로 기본 noindex.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function LegacyLandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
