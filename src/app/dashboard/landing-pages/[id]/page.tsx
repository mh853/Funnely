// 랜딩페이지 편집은 /edit로 일원화됨 - 예전 섹션 빌더 경로 호환을 위한 리다이렉트
import { redirect } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default function LandingPageDetailPage({ params }: Props) {
  redirect(`/dashboard/landing-pages/${params.id}/edit`)
}
