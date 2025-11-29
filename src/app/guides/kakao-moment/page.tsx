import Link from 'next/link'
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function KakaoMomentSetupGuide() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/dashboard/settings/api-credentials"
          className="inline-flex items-center text-yellow-600 hover:text-yellow-700 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          API 인증 정보 설정으로 돌아가기
        </Link>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 h-12 w-12 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-gray-900 font-bold text-2xl">K</span>
            </div>
            <h1 className="ml-4 text-3xl font-bold text-gray-900">Kakao Moment API 설정 가이드</h1>
          </div>
          <p className="text-gray-600">
            카카오 모먼트 광고를 Funnely에 연동하기 위한 Kakao Developers 설정 방법을 안내합니다.
          </p>
        </div>

        {/* Prerequisites */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">시작하기 전에</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>카카오 계정이 필요합니다</li>
                <li>Kakao Developers 앱이 필요합니다</li>
                <li>카카오 모먼트 광고 계정이 필요합니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step 1: Register App */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Kakao Developers 앱 등록</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-1. Kakao Developers 접속</h3>
              <p className="text-gray-600 mb-2">아래 링크로 이동하여 카카오 계정으로 로그인합니다:</p>
              <a
                href="https://developers.kakao.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-yellow-400 text-gray-900 px-4 py-2 rounded hover:bg-yellow-500 transition font-medium"
              >
                Kakao Developers 열기 →
              </a>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1-2. 애플리케이션 추가</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>우측 상단의 <strong>&quot;내 애플리케이션&quot;</strong> 클릭</li>
                <li><strong>&quot;애플리케이션 추가하기&quot;</strong> 버튼 클릭</li>
                <li>앱 정보 입력:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 앱 이름: &quot;Funnely 광고 연동&quot; (또는 원하는 이름)</li>
                    <li>• 사업자명: 회사 이름 또는 사업자명</li>
                  </ul>
                </li>
                <li><strong>&quot;저장&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 앱 등록 후 카카오 검수가 필요할 수 있습니다. 개인 개발자는 즉시 사용 가능하지만, 비즈니스 용도는 사업자 등록증 제출이 필요할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Get API Keys */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">API 키 확인</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2-1. REST API 키 복사</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>생성한 앱을 클릭하여 앱 설정 페이지로 이동</li>
                <li>좌측 메뉴에서 <strong>&quot;앱 키&quot;</strong> 클릭</li>
                <li><strong>&quot;REST API 키&quot;</strong> 확인 및 복사</li>
              </ol>

              <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-900 mb-2">REST API 키 예시:</p>
                <code className="block bg-white p-2 rounded text-sm font-mono text-gray-700 border">
                  1234567890abcdef1234567890abcdef
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2-2. JavaScript 키 복사</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>같은 <strong>&quot;앱 키&quot;</strong> 페이지에서</li>
                <li><strong>&quot;JavaScript 키&quot;</strong> 확인 및 복사</li>
              </ol>

              <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-gray-900 mb-2">JavaScript 키 예시:</p>
                <code className="block bg-white p-2 rounded text-sm font-mono text-gray-700 border">
                  abcdef1234567890abcdef1234567890
                </code>
              </div>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    <strong>보안 경고:</strong> API 키는 절대 공개 저장소나 클라이언트 코드에 노출하지 마세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Platform Settings */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">플랫폼 설정</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3-1. 플랫폼 추가</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>좌측 메뉴에서 <strong>&quot;플랫폼&quot;</strong> 클릭</li>
                <li><strong>&quot;Web 플랫폼 등록&quot;</strong> 클릭</li>
                <li>사이트 도메인 입력:
                  <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
                  </div>
                </li>
                <li><strong>&quot;저장&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 로컬 개발 환경을 위해 <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000</code>도 추가할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Step 4: Redirect URI */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Redirect URI 설정</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4-1. 카카오 로그인 활성화</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>좌측 메뉴에서 <strong>&quot;카카오 로그인&quot;</strong> 클릭</li>
                <li><strong>&quot;활성화 설정&quot;</strong>의 <strong>&quot;ON&quot;</strong> 버튼 클릭</li>
                <li><strong>&quot;Redirect URI&quot;</strong> 섹션으로 이동</li>
                <li><strong>&quot;Redirect URI 등록&quot;</strong> 클릭</li>
                <li>다음 URI 입력:
                  <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-sm">
                    {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback/kakao` : 'https://your-domain.com/auth/callback/kakao'}
                  </div>
                </li>
                <li><strong>&quot;저장&quot;</strong> 클릭</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>주의:</strong> Redirect URI는 정확히 일치해야 합니다. http/https, 포트 번호까지 모두 확인하세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Consent Items */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">동의 항목 설정</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">5-1. 필수 동의 항목 설정</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>좌측 메뉴에서 <strong>&quot;동의 항목&quot;</strong> 클릭</li>
                <li>다음 항목들을 <strong>&quot;필수 동의&quot;</strong>로 설정:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 닉네임</li>
                    <li>• 카카오계정 (이메일)</li>
                    <li>• 프로필 사진</li>
                  </ul>
                </li>
                <li>광고 관련 권한 확인 (카카오 모먼트 사용 시):
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 카카오 모먼트 광고 관리</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>💡 팁:</strong> 일부 권한은 카카오 비즈니스 검수가 필요할 수 있습니다.
                초기에는 기본 정보만 사용하고, 필요에 따라 추가 권한을 신청하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Step 6: Kakao Moment Setup */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center font-bold">
              6
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">카카오 모먼트 연동 (광고 계정)</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6-1. 카카오 모먼트 접속</h3>
              <p className="text-gray-600 mb-2">카카오 모먼트 광고 관리 페이지로 이동:</p>
              <a
                href="https://moment.kakao.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-yellow-400 text-gray-900 px-4 py-2 rounded hover:bg-yellow-500 transition font-medium"
              >
                카카오 모먼트 열기 →
              </a>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">6-2. 광고 계정 생성</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>카카오 계정으로 로그인</li>
                <li><strong>&quot;광고 계정 만들기&quot;</strong> 클릭</li>
                <li>광고 계정 정보 입력:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>• 광고주명: 회사 이름</li>
                    <li>• 사업자 정보: 사업자 등록 정보</li>
                    <li>• 업종: 의료/건강</li>
                  </ul>
                </li>
                <li>결제 수단 등록 (신용카드 또는 계좌)</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>참고:</strong> 카카오 모먼트는 사업자 등록이 필수입니다.
                    개인 개발자 계정으로는 광고 집행이 제한될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 7: Enter in Funnely */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 h-8 w-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
              7
            </div>
            <h2 className="ml-3 text-2xl font-bold text-gray-900">Funnely에 인증 정보 입력</h2>
          </div>

          <div className="ml-11 space-y-4">
            <div>
              <p className="text-gray-600 mb-4">
                Kakao Developers에서 확인한 정보를 Funnely에 입력합니다.
              </p>

              <div className="bg-yellow-50 p-6 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kakao REST API Key
                  </label>
                  <p className="text-sm text-gray-600">
                    • Kakao Developers → 앱 키에서 복사한 <strong>REST API 키</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kakao JavaScript Key
                  </label>
                  <p className="text-sm text-gray-600">
                    • Kakao Developers → 앱 키에서 복사한 <strong>JavaScript 키</strong>
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
                ❌ &quot;Invalid API Key&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>REST API 키를 정확하게 복사했는지 확인</li>
                <li>앞뒤 공백이 포함되지 않았는지 확인</li>
                <li>Native App Key가 아닌 REST API Key인지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;Redirect URI Mismatch&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>카카오 로그인이 활성화되어 있는지 확인</li>
                <li>Redirect URI가 정확히 일치하는지 확인 (대소문자, 슬래시 포함)</li>
                <li>http/https 프로토콜이 일치하는지 확인</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ 카카오 모먼트 광고 계정 생성 불가
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>사업자 등록증이 정확히 입력되었는지 확인</li>
                <li>의료 광고는 추가 심사가 필요할 수 있음</li>
                <li>카카오 비즈니스 고객센터에 문의 필요</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ❌ &quot;권한이 없습니다&quot; 오류
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                <li>동의 항목에서 필요한 권한이 활성화되어 있는지 확인</li>
                <li>일부 권한은 카카오 비즈니스 검수가 필요</li>
                <li>앱 상태가 &quot;개발 중&quot;이 아닌 &quot;서비스 중&quot;인지 확인</li>
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
                href="https://developers.kakao.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-700 underline"
              >
                📚 Kakao Developers 공식 문서
              </a>
            </li>
            <li>
              <a
                href="https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-700 underline"
              >
                📖 카카오 로그인 REST API 가이드
              </a>
            </li>
            <li>
              <a
                href="https://moment.kakao.com/support"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-700 underline"
              >
                💼 카카오 모먼트 고객센터
              </a>
            </li>
            <li>
              <a
                href="https://cs.kakao.com/helps?service=8&locale=ko"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-700 underline"
              >
                🆘 카카오 비즈니스 고객지원
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
