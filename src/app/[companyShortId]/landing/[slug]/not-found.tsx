export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">랜딩 페이지를 찾을 수 없습니다</p>
        <p className="text-sm text-gray-500">
          요청하신 페이지가 존재하지 않거나 삭제되었습니다.
        </p>
      </div>
    </div>
  )
}
