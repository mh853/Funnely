// contact 페이지가 클라이언트 컴포넌트라 metadata를 export할 수 없어, 레이아웃에서 SEO 메타(title/canonical)를 제공
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '문의하기 | 퍼널리',
  description:
    '퍼널리 도입, 기능, 커스터마이징 문의를 남겨주세요. 영업일 기준 24시간 내에 답변드립니다.',
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
