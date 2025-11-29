import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Funnely
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          회사 마케팅 담당자를 위한 통합 광고 관리 플랫폼
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">통합 대시보드</h3>
            <p className="text-gray-600 text-sm">
              메타, 카카오, 구글 광고를 한눈에 관리
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">실시간 분석</h3>
            <p className="text-gray-600 text-sm">
              광고 성과를 실시간으로 분석하고 최적화
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">안전한 관리</h3>
            <p className="text-gray-600 text-sm">
              회사별 데이터 격리와 권한 관리
            </p>
          </div>
        </div>
        <div className="mt-12 flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/auth/signup"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
          >
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
