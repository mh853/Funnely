import Link from 'next/link'
import MarketingHeader from '@/components/marketing/layout/MarketingHeader'
import MarketingFooter from '@/components/marketing/layout/MarketingFooter'

export const metadata = {
  title: '개인정보처리방침 | 퍼널리',
  description: '퍼널리 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500 mb-10">최종 업데이트: 2026년 4월 10일</p>

          <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 개인정보 수집 항목 및 수집 방법</h2>
              <p>
                퍼널리(이하 &quot;회사&quot;)는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>필수 항목: 이메일 주소, 비밀번호(암호화), 회사명</li>
                <li>선택 항목: 이름, 전화번호</li>
                <li>서비스 이용 과정에서 자동 수집: 접속 IP, 쿠키, 서비스 이용 기록, 브라우저 정보</li>
              </ul>
              <p className="mt-3">
                개인정보는 회원가입 양식, 문의 양식, 서비스 이용 과정에서 수집됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 개인정보 수집 및 이용 목적</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>서비스 제공, 계정 관리 및 본인 확인</li>
                <li>결제 처리 및 요금 청구</li>
                <li>고객 지원 및 문의 처리</li>
                <li>서비스 개선 및 신규 기능 개발</li>
                <li>법령에 따른 의무 이행</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 개인정보 보유 및 이용 기간</h2>
              <p>
                회사는 개인정보 수집 및 이용 목적이 달성된 후 해당 정보를 지체 없이 파기합니다.
                단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>계약 또는 청약철회에 관한 기록: 5년 (전자상거래법)</li>
                <li>대금결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)</li>
                <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
                <li>접속에 관한 기록: 3개월 (통신비밀보호법)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
              <p>
                회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
                다만, 아래의 경우에는 예외로 합니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에서 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 개인정보 처리 위탁</h2>
              <p>
                회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 외부 전문업체에 위탁합니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>Supabase Inc.: 데이터베이스 및 인증 서비스</li>
                <li>결제 대행사: 결제 처리 (계약 체결 시 명시)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 이용자의 권리</h2>
              <p>이용자는 언제든지 아래의 권리를 행사할 수 있습니다.</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>개인정보 열람 요청</li>
                <li>오류 정정 요청</li>
                <li>삭제 요청</li>
                <li>처리 정지 요청</li>
              </ul>
              <p className="mt-3">
                위 권리 행사는 서비스 내 계정 설정 또는{' '}
                <a href="mailto:support@funnely.com" className="text-blue-600 hover:underline">
                  support@funnely.com
                </a>
                으로 요청하실 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. 쿠키 사용</h2>
              <p>
                회사는 서비스 제공을 위해 쿠키를 사용합니다. 브라우저 설정을 통해 쿠키 사용을 거부할 수 있으나,
                일부 서비스 기능이 제한될 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. 개인정보 보호책임자</h2>
              <p>
                개인정보 보호 관련 문의, 불만, 피해구제 등에 관한 사항은 아래 담당자에게 연락하시기 바랍니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>개인정보 보호책임자: 퍼널리 개인정보보호팀</li>
                <li>이메일: <a href="mailto:privacy@funnely.com" className="text-blue-600 hover:underline">privacy@funnely.com</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. 개인정보처리방침 변경</h2>
              <p>
                이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용이 변경될 수 있습니다.
                변경 시 서비스 내 공지사항을 통해 안내드립니다.
              </p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
