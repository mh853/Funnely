// 랜딩페이지 수정 화면 전환 중 표시되는 로딩 스켈레톤
export default function LandingPageEditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
