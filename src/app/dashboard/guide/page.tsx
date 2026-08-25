// 로그인한 사용자만 볼 수 있는 대시보드 사용 가이드 (dashboard/layout.tsx의 로그인 가드를 그대로 재사용)
import GuideContent from '@/components/dashboard/guide/GuideContent'

export default function GuidePage() {
  return (
    <div className="px-4 max-w-4xl mx-auto">
      <GuideContent />
    </div>
  )
}
