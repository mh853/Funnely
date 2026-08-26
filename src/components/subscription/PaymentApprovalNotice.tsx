// 토스 결제 정식 승인 전까지 결제/카드등록 단계에서 노출하는 안내 배너
export default function PaymentApprovalNotice({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}>
      결제 시스템 정식 오픈 준비 중입니다. 현재 카드 등록/결제는 테스트 환경으로 연결되며, 정식 승인 전까지 실제 청구(출금)는 발생하지 않습니다.
    </div>
  )
}
