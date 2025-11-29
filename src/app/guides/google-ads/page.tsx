import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function GoogleAdsSetupGuide() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/dashboard/settings/api-credentials"
          className="inline-flex items-center text-red-600 hover:text-red-700 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          API 인증 정보 설정으로 돌아가기
        </Link>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">G</span>
            </div>
            <h1 className="ml-4 text-3xl font-bold text-gray-900">Google Ads API 설정 가이드</h1>
          </div>
          <p className="text-gray-600">
            Google 검색 광고 및 디스플레이 네트워크를 Funnely에 연동하기 위한 Google Cloud 및 Google Ads 설정 방법을 안내합니다.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">시작하기 전에</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                <li>Google 계정이 필요합니다</li>
                <li>Google Ads 계정이 필요합니다</li>
                <li>Google Cloud Platform (GCP) 프로젝트가 필요합니다</li>
                <li>Google Ads Developer Token이 필요합니다 (승인 과정 필요)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Google Cloud Project */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Google Cloud 프로젝트 생성</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-1. Google Cloud Console 접속</h3>
              <p className="text-gray-600 mb-2">아래 링크로 이동하여 Google 계정으로 로그인합니다:</p>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Google Cloud Console 열기 →
              </a>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-2. 새 프로젝트 만들기</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>상단의 프로젝트 선택 드롭다운 클릭</li>
                <li><strong>&quot;새 프로젝트&quot;</strong> 클릭</li>
                <li>프로젝트 정보 입력:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 프로젝트 이름: &quot;Funnely Ads&quot; (또는 원하는 이름)</li>
                    <li>• 조직: 선택 (없으면 &quot;조직 없음&quot;)</li>
                  </ul>
                </li>
                <li><strong>&quot;만들기&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> Google Cloud는 무료 평가판($300 크레딧)을 제공합니다.
                API 호출은 소량이므로 크레딧 내에서 충분히 사용 가능합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Enable Google Ads API */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Google Ads API 활성화</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2-1. API 라이브러리 접속</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Google Cloud Console 좌측 메뉴에서 <strong>&quot;API 및 서비스&quot;</strong> → <strong>&quot;라이브러리&quot;</strong> 클릭</li>
                <li>검색창에 <strong>&quot;Google Ads API&quot;</strong> 입력</li>
                <li><strong>&quot;Google Ads API&quot;</strong> 선택</li>
                <li><strong>&quot;사용&quot;</strong> 버튼 클릭</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>주의:</strong> API 활성화 후 몇 분 정도 소요될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Create OAuth Credentials */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">OAuth 2.0 클라이언트 ID 생성</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-1. OAuth 동의 화면 구성</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>좌측 메뉴에서 <strong>&quot;API 및 서비스&quot;</strong> → <strong>&quot;OAuth 동의 화면&quot;</strong> 클릭</li>
                <li>사용자 유형 선택:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• <strong>&quot;외부&quot;</strong> 선택 (조직 계정이 아닌 경우)</li>
                  </ul>
                </li>
                <li><strong>&quot;만들기&quot;</strong> 클릭</li>
                <li>앱 정보 입력:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 앱 이름: &quot;Funnely&quot;</li>
                    <li>• 사용자 지원 이메일: 회사 담당자 이메일</li>
                    <li>• 개발자 연락처 정보: 개발자 이메일</li>
                  </ul>
                </li>
                <li><strong>&quot;저장 후 계속&quot;</strong> 클릭</li>
                <li>범위 추가:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• <strong>&quot;범위 추가 또는 삭제&quot;</strong> 클릭</li>
                    <li>• <strong>&quot;https://www.googleapis.com/auth/adwords&quot;</strong> 선택</li>
                    <li>• <strong>&quot;업데이트&quot;</strong> 클릭</li>
                  </ul>
                </li>
                <li><strong>&quot;저장 후 계속&quot;</strong> 클릭하여 완료</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-2. OAuth 클라이언트 ID 생성</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>좌측 메뉴에서 <strong>&quot;사용자 인증 정보&quot;</strong> 클릭</li>
                <li>상단의 <strong>&quot;+ 사용자 인증 정보 만들기&quot;</strong> → <strong>&quot;OAuth 클라이언트 ID&quot;</strong> 클릭</li>
                <li>애플리케이션 유형: <strong>&quot;웹 애플리케이션&quot;</strong> 선택</li>
                <li>이름: &quot;Funnely Web Client&quot;</li>
                <li><strong>&quot;승인된 리디렉션 URI&quot;</strong>에 다음 추가:
                  <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                    {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback/google` : 'https://your-domain.com/auth/callback/google'}
                  </div>
                </li>
                <li><strong>&quot;만들기&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-3. 클라이언트 ID와 시크릿 복사</h3>
              <p className="text-gray-600 mb-2">생성 완료 후 표시되는 팝업에서:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li><strong>클라이언트 ID</strong> 복사 및 저장</li>
                <li><strong>클라이언트 보안 비밀번호</strong> 복사 및 저장</li>
              </ul>

              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      <strong>보안 경고:</strong> 클라이언트 보안 비밀번호는 절대 공개하지 마세요.
                      유출 시 즉시 새로운 클라이언트 ID를 생성하세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Get Developer Token */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Google Ads Developer Token 신청</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4-1. Google Ads 계정 접속</h3>
              <p className="text-gray-600 mb-2">Google Ads 관리자 계정으로 이동:</p>
              <a
                href="https://ads.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Google Ads 열기 →
              </a>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4-2. Developer Token 확인</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Google Ads 계정에 로그인</li>
                <li>우측 상단의 <strong>&quot;도구 및 설정&quot;</strong> (렌치 아이콘) 클릭</li>
                <li><strong>&quot;설정&quot;</strong> → <strong>&quot;API 센터&quot;</strong> 클릭</li>
                <li>Developer Token 섹션에서:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 이미 토큰이 있다면 복사</li>
                    <li>• 없다면 <strong>&quot;토큰 생성&quot;</strong> 클릭</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4-3. 토큰 승인 신청 (선택사항)</h3>
              <p className="text-gray-600 mb-2">
                초기에는 <strong>&quot;테스트&quot;</strong> 수준의 토큰이 발급되며, 자신의 광고 계정에만 접근할 수 있습니다.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>테스트 수준 토큰:</strong>
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>자신의 Google Ads 관리자 계정 및 하위 계정에만 접근 가능</li>
                  <li>일일 API 호출 한도: 15,000회</li>
                  <li>별도 승인 과정 없이 즉시 사용 가능</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>프로덕션 수준 토큰 (고급):</strong>
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-2">
                  <li>다른 사용자의 광고 계정에도 접근 가능</li>
                  <li>일일 API 호출 한도: 무제한</li>
                  <li>Google 검토 및 승인 필요 (수 주 소요)</li>
                  <li>회사 자체 광고만 관리한다면 테스트 수준으로 충분</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>참고:</strong> 대부분의 회사은 테스트 수준 Developer Token으로 충분합니다.
                    자신의 광고 계정만 관리하므로 프로덕션 승인이 불필요합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Link Manager Account */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Google Ads 관리자 계정 설정</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5-1. 관리자 계정 확인</h3>
              <p className="text-gray-600 mb-4">
                Google Ads API를 사용하려면 <strong>관리자 계정</strong> (Manager Account, MCC)이 필요합니다.
              </p>

              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>이미 관리자 계정이 있다면 해당 계정 사용</li>
                <li>없다면 관리자 계정 생성:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Ads 관리자 계정 생성</a></li>
                    <li>• 계정 정보 입력 후 생성</li>
                  </ul>
                </li>
                <li>기존 광고 계정을 관리자 계정에 연결:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 관리자 계정에서 <strong>&quot;계정&quot;</strong> 메뉴 클릭</li>
                    <li>• <strong>&quot;+ 추가&quot;</strong> → <strong>&quot;기존 계정 연결&quot;</strong></li>
                    <li>• 고객 ID 입력 후 연결 요청</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 관리자 계정(MCC)은 여러 광고 계정을 하나의 인터페이스로 관리할 수 있게 해주는 계정입니다.
                API 접근을 위해 필수입니다.
              </p>
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
                Google Cloud 및 Google Ads에서 확인한 정보를 Funnely에 입력합니다.
              </p>

              <div className="bg-red-50 p-6 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Client ID
                  </label>
                  <p className="text-sm text-gray-600">
                    • Google Cloud Console → 사용자 인증 정보에서 생성한 <strong>OAuth 2.0 클라이언트 ID</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Client Secret
                  </label>
                  <p className="text-sm text-gray-600">
                    • Google Cloud Console → 사용자 인증 정보에서 생성한 <strong>클라이언트 보안 비밀번호</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Ads Developer Token
                  </label>
                  <p className="text-sm text-gray-600">
                    • Google Ads → API 센터에서 발급받은 <strong>Developer Token</strong>
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
                ❌ &quot;Invalid Client ID&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>클라이언트 ID를 정확하게 복사했는지 확인</li>
                <li>앞뒤 공백이 포함되지 않았는지 확인</li>
                <li>OAuth 2.0 클라이언트 ID가 활성화되어 있는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;Redirect URI Mismatch&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>승인된 리디렉션 URI가 정확히 일치하는지 확인</li>
                <li>http/https 프로토콜이 일치하는지 확인</li>
                <li>포트 번호, 경로가 정확히 일치하는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;Developer Token is invalid&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Developer Token을 정확하게 복사했는지 확인</li>
                <li>토큰이 활성화되어 있는지 확인 (Google Ads API 센터에서)</li>
                <li>관리자 계정 (MCC)에서 발급한 토큰인지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ 광고 계정에 접근할 수 없음
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>관리자 계정(MCC)이 광고 계정과 연결되어 있는지 확인</li>
                <li>OAuth 범위에 <code>https://www.googleapis.com/auth/adwords</code>가 포함되어 있는지 확인</li>
                <li>광고 계정 관리자 권한이 있는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;API not enabled&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>Google Cloud Console에서 Google Ads API가 활성화되어 있는지 확인</li>
                <li>올바른 프로젝트에서 API를 활성화했는지 확인</li>
                <li>API 활성화 후 5-10분 대기</li>
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
                href="https://developers.google.com/google-ads/api/docs/start"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 underline"
              >
                📚 Google Ads API 시작 가이드
              </a>
            </li>
            <li>
              <a
                href="https://developers.google.com/google-ads/api/docs/oauth/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 underline"
              >
                📖 Google Ads OAuth 설정 가이드
              </a>
            </li>
            <li>
              <a
                href="https://support.google.com/google-ads/answer/7459399"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 underline"
              >
                💼 관리자 계정(MCC) 가이드
              </a>
            </li>
            <li>
              <a
                href="https://developers.google.com/google-ads/api/docs/access-levels"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 underline"
              >
                🔑 Developer Token 액세스 수준 설명
              </a>
            </li>
            <li>
              <a
                href="https://support.google.com/googleapi/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:text-red-700 underline"
              >
                🆘 Google API 고객지원
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
