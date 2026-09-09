// 고객 광고 랜딩페이지·신청완료 페이지 공통 레이아웃 - 검색엔진 색인 제외(noindex) 기본값 적용 (노션 37번)
import type { Metadata } from 'next'

// 고객이 만드는 광고 랜딩페이지는 {shortId}.funnely.co.kr / 커스텀 도메인에서 이 세그먼트로
// 렌더링된다. 수백 개 고객사 페이지가 funnely.co.kr 도메인 아래 색인되면 본 사이트의
// 검색 품질을 깎으므로 기본값을 noindex로 둔다. 하위 page의 generateMetadata는 robots를
// 지정하지 않으므로 이 값이 그대로 상속된다(title/og 등은 각 페이지가 계속 채움).
// robots.txt Disallow가 아니라 meta noindex를 쓰는 이유는 src/app/robots.ts 참고.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function CompanyLandingLayout({ children }: { children: React.ReactNode }) {
  return children
}
