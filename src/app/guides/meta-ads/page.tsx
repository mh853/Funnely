import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function MetaAdsSetupGuide() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/dashboard/settings/api-credentials"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          API 인증 정보 설정으로 돌아가기
        </Link>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">f</span>
            </div>
            <h1 className="ml-4 text-3xl font-bold text-gray-900">Meta Ads API 설정 가이드</h1>
          </div>
          <p className="text-gray-600">
            Facebook과 Instagram 광고를 Funnely에 연동하기 위한 Meta for Developers 설정 방법을 안내합니다.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">시작하기 전에</h3>
              <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>Facebook 비즈니스 계정이 필요합니다</li>
                <li>Meta for Developers 계정이 필요합니다</li>
                <li>광고 계정 관리자 권한이 있어야 합니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Create App */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Meta for Developers 앱 생성</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-1. Meta for Developers 접속</h3>
              <p className="text-gray-600 mb-2">아래 링크로 이동하여 로그인합니다:</p>
              <a
                href="https://developers.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Meta for Developers 열기 →
              </a>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-2. 새 앱 만들기</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>오른쪽 상단의 <strong>&quot;내 앱&quot;</strong> 클릭</li>
                <li><strong>&quot;앱 만들기&quot;</strong> 버튼 클릭</li>
                <li>앱 유형 선택: <strong>&quot;비즈니스&quot;</strong> 선택</li>
                <li>앱 정보 입력:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 앱 이름: &quot;Funnely 광고 연동&quot; (또는 원하는 이름)</li>
                    <li>• 앱 연락처 이메일: 회사 담당자 이메일</li>
                  </ul>
                </li>
                <li><strong>&quot;앱 만들기&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 앱 이름은 나중에 변경할 수 있으니 걱정하지 마세요.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Add Marketing API */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Marketing API 제품 추가</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2-1. Marketing API 설정</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>앱 대시보드 왼쪽 메뉴에서 <strong>&quot;제품 추가&quot;</strong> 클릭</li>
                <li><strong>&quot;Marketing API&quot;</strong> 찾기</li>
                <li><strong>&quot;설정&quot;</strong> 버튼 클릭</li>
                <li>도구 선택에서 <strong>&quot;시작하기&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>주의:</strong> Marketing API는 광고 관리 권한이 필요합니다. Facebook 비즈니스 계정과 연결되어 있는지 확인하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Get Credentials */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">앱 ID와 앱 시크릿 확인</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-1. 앱 ID 복사</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>앱 대시보드 왼쪽 메뉴에서 <strong>&quot;설정&quot;</strong> → <strong>&quot;기본 설정&quot;</strong> 클릭</li>
                <li>페이지 상단에 <strong>&quot;앱 ID&quot;</strong> 표시됨</li>
                <li>앱 ID 옆의 복사 버튼 클릭하여 복사</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-2. 앱 시크릿 확인</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>앱 ID 아래 <strong>&quot;앱 시크릿&quot;</strong> 필드 찾기</li>
                <li><strong>&quot;표시&quot;</strong> 버튼 클릭 (Facebook 비밀번호 입력 필요)</li>
                <li>표시된 앱 시크릿 복사</li>
              </ol>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>보안 경고:</strong> 앱 시크릿은 절대 공개하지 마세요. 이 정보가 유출되면 광고 계정이 위험에 노출될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Configure OAuth */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">OAuth 리디렉션 URI 설정</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4-1. 리디렉션 URI 추가</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>여전히 <strong>&quot;기본 설정&quot;</strong> 페이지에서 진행</li>
                <li>아래로 스크롤하여 <strong>&quot;앱 도메인&quot;</strong> 섹션 찾기</li>
                <li>다음 도메인 추가:
                  <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
                  </div>
                </li>
                <li>더 아래로 스크롤하여 <strong>&quot;Facebook 로그인&quot;</strong> → <strong>&quot;설정&quot;</strong> 메뉴 클릭</li>
                <li><strong>&quot;유효한 OAuth 리디렉션 URI&quot;</strong>에 다음 추가:
                  <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                    {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback/meta` : 'https://your-domain.com/auth/callback/meta'}
                  </div>
                </li>
                <li><strong>&quot;변경 내용 저장&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 로컬 테스트를 위해 <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000/auth/callback/meta</code>도 추가할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Step 5: App Review */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">앱 모드 변경 (선택사항)</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                개발 모드에서는 앱 관리자와 개발자만 사용할 수 있습니다.
                실제 사용자들이 접근하려면 <strong>라이브 모드</strong>로 전환해야 합니다.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">라이브 모드 전환 방법</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>앱 대시보드 상단의 모드 토글 스위치 확인</li>
                <li><strong>&quot;개발 모드&quot;</strong>에서 <strong>&quot;라이브 모드&quot;</strong>로 전환</li>
                <li>필요한 권한 검토 및 앱 검수 제출 (필요한 경우)</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>참고:</strong> 초기 테스트 단계에서는 개발 모드로 진행해도 됩니다.
                    테스트 사용자를 앱 역할에 추가하면 개발 모드에서도 접근할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6: Enter in Funnely */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
              6
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Funnely에 인증 정보 입력</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                Meta for Developers에서 확인한 정보를 Funnely에 입력합니다.
              </p>

              <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta App ID
                  </label>
                  <p className="text-sm text-gray-600">
                    • Meta for Developers → 설정 → 기본 설정에서 복사한 <strong>앱 ID</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta App Secret
                  </label>
                  <p className="text-sm text-gray-600">
                    • Meta for Developers → 설정 → 기본 설정에서 복사한 <strong>앱 시크릿</strong>
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/dashboard/settings/api-credentials"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                  Funnely에 인증 정보 입력하기
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">문제 해결</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;Invalid App ID&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>앱 ID를 정확하게 복사했는지 확인</li>
                <li>앞뒤 공백이 포함되지 않았는지 확인</li>
                <li>Meta for Developers에서 앱이 활성화되어 있는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;Redirect URI Mismatch&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>OAuth 리디렉션 URI가 정확하게 설정되었는지 확인</li>
                <li>http/https 프로토콜이 일치하는지 확인</li>
                <li>포트 번호가 포함된 경우 정확히 일치하는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ 광고 계정에 접근할 수 없음
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Facebook 비즈니스 계정이 광고 계정과 연결되어 있는지 확인</li>
                <li>Marketing API 제품이 앱에 추가되었는지 확인</li>
                <li>필요한 권한 (ads_management, ads_read)이 요청되었는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ 앱이 개발 모드에 고정됨
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>앱 검수가 필요한 권한을 요청하는 경우 Meta 앱 검수 제출 필요</li>
                <li>개발 모드에서는 테스트 사용자를 앱 역할에 추가하여 사용</li>
                <li>비즈니스 앱의 경우 비즈니스 인증이 필요할 수 있음</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">추가 리소스</h2>
          <ul className="space-y-2">
            <li>
              <a
                href="https://developers.facebook.com/docs/marketing-apis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                📚 Meta Marketing API 공식 문서
              </a>
            </li>
            <li>
              <a
                href="https://developers.facebook.com/docs/development/create-an-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                📖 Meta 앱 만들기 가이드
              </a>
            </li>
            <li>
              <a
                href="https://business.facebook.com/latest/inbox/all"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                💼 Facebook 비즈니스 고객센터
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
