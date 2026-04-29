import Link from 'next/link'
import MarketingHeader from '@/components/marketing/layout/MarketingHeader'
import MarketingFooter from '@/components/marketing/layout/MarketingFooter'

export const metadata = {
  title: '이용약관 | 퍼널리',
  description: '퍼널리 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
          <p className="text-sm text-gray-500 mb-10">최종 업데이트: 2026년 4월 10일</p>

          <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
              <p>
                이 약관은 퍼널리(이하 "회사")가 제공하는 퍼널리 서비스(이하 "서비스")의 이용 조건 및
                절차, 회사와 이용자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제2조 (정의)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>"서비스"</strong>란 회사가 제공하는 랜딩페이지 빌더, 리드 관리, 트래픽 분석 등의
                  마케팅 플랫폼 서비스를 의미합니다.
                </li>
                <li>
                  <strong>"이용자"</strong>란 이 약관에 동의하고 서비스를 이용하는 개인 또는 법인을 의미합니다.
                </li>
                <li>
                  <strong>"계정"</strong>이란 이용자가 서비스를 이용하기 위해 생성한 고유 식별 정보를 의미합니다.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제3조 (약관의 효력과 변경)</h2>
              <p>
                이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
                회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지 후 효력이 발생합니다.
                변경 후에도 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 간주합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제4조 (서비스 이용 계약)</h2>
              <p>
                서비스 이용 계약은 이용자가 회원가입 절차를 완료하고 회사가 이를 승인함으로써 성립합니다.
                회사는 아래의 경우 이용 신청을 거절할 수 있습니다.
              </p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>타인의 명의를 사용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>관련 법령에 위반되는 목적으로 신청한 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제5조 (서비스 요금)</h2>
              <p>
                서비스는 베이직 플랜(₩19,000/월)과 프로 플랜(₩200,000/월)으로 제공됩니다.
                프로 플랜은 14일 무료 체험이 가능합니다. 연간 결제 시 2개월 무료 혜택이 제공됩니다.
              </p>
              <p className="mt-3">
                결제 주기, 환불 등 요금 관련 세부 사항은 서비스 내 요금제 안내 페이지를 참조하시기 바랍니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제6조 (환불 정책)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>무료 체험 기간 중 취소 시: 요금이 청구되지 않습니다.</li>
                <li>결제 후 7일 이내 취소 시: 서비스를 사용하지 않은 경우 전액 환불합니다.</li>
                <li>결제 후 7일 초과 시: 당월 잔여 기간에 대한 일할 계산 환불이 불가합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제7조 (이용자의 의무)</h2>
              <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
              <ul className="mt-3 list-disc pl-6 space-y-1">
                <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
                <li>서비스를 통해 불법적인 콘텐츠를 게시·배포하는 행위</li>
                <li>서비스의 정상적인 운영을 방해하는 행위</li>
                <li>회사의 지적재산권을 침해하는 행위</li>
                <li>관련 법령을 위반하는 행위</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제8조 (서비스 중단)</h2>
              <p>
                회사는 서버 점검, 시스템 장애, 천재지변 등의 사유로 서비스를 일시 중단할 수 있습니다.
                계획된 중단의 경우 사전에 서비스 내 공지를 통해 안내합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제9조 (책임 제한)</h2>
              <p>
                회사는 천재지변, 불가항력적인 사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.
                이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서도 회사는 책임지지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">제10조 (분쟁 해결)</h2>
              <p>
                이 약관과 관련된 분쟁은 대한민국 법률에 따라 처리되며,
                소송이 제기될 경우 회사 소재지를 관할하는 법원을 제1심 관할 법원으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">부칙</h2>
              <p>이 약관은 2026년 4월 10일부터 시행합니다.</p>
            </section>

          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 flex gap-6">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
              ← 홈으로 돌아가기
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  )
}
