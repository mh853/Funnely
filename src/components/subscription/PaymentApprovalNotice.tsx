'use client'

// 토스 결제 정식 승인 전까지 결제/카드등록 단계에 노출하는 안내 배너 +
// 정식 오픈 알림 이메일 신청 폼 (노션 31번 "홈페이지_결제_릴리즈 전 노티" 후속)
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PaymentApprovalNotice({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  const handleSubmit = async () => {
    if (!email) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/subscription/payment-launch-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '신청에 실패했습니다.')
      setStatus('done')
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message || '신청에 실패했습니다.')
    }
  }

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}>
      <p>
        결제 시스템 정식 오픈 준비 중입니다(9~10월 중 오픈 예정). 현재 카드 등록/결제는 테스트 환경으로 연결되며, 정식 승인 전까지 실제 청구(출금)는 발생하지 않습니다.
      </p>

      {status === 'done' ? (
        <p className="mt-2 font-medium text-amber-900">정식 오픈 알림 신청이 완료되었습니다.</p>
      ) : (
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="알림 받을 이메일"
            className="flex-1 min-w-0 px-3 py-1.5 border border-amber-300 rounded-md text-sm text-gray-900 bg-white"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'loading' || !email}
            className="px-4 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? '신청 중...' : '오픈 알림 받기'}
          </button>
        </div>
      )}

      {status === 'error' && <p className="mt-1 text-red-600 text-xs">{errorMsg}</p>}
    </div>
  )
}
