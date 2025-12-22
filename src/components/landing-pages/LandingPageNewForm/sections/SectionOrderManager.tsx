'use client'

/**
 * Section Order Manager
 * Manages the order of sections displayed on the landing page
 * TODO: Implement section ordering with sections array
 */
export default function SectionOrderManager() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">섹션 순서 설정</h2>
        <p className="mt-1 text-sm text-gray-600">
          랜딩페이지에 표시될 섹션의 순서를 조정하세요
        </p>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          섹션 순서 관리 기능은 추후 업데이트 예정입니다.
        </p>
      </div>
    </div>
  )
}
