'use client'

// 결제 정식 오픈 알림 신청자 목록 + 전원 발송 (노션 31번 항목 후속)
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Send } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date'

interface NotifySignup {
  id: string
  email: string
  created_at: string
  launch_email_sent_at: string | null
}

export default function PaymentLaunchNotifyPage() {
  const [signups, setSignups] = useState<NotifySignup[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const fetchSignups = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/payment-launch-notify')
      const data = await res.json()
      setSignups(data.signups || [])
    } catch (error) {
      console.error('Error fetching payment launch notify signups:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignups()
  }, [])

  const pendingCount = signups.filter((s) => !s.launch_email_sent_at).length

  const handleSendAll = async () => {
    if (pendingCount === 0) return
    if (!confirm(`아직 발송되지 않은 ${pendingCount}명 전원에게 정식 오픈 안내 메일을 보냅니다. 계속할까요?`)) return

    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/admin/payment-launch-notify/send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '발송에 실패했습니다.')
      setSendResult(`발송 완료: 성공 ${data.sent}건, 실패 ${data.failed}건`)
      await fetchSignups()
    } catch (error: any) {
      setSendResult(error.message || '발송 중 오류가 발생했습니다.')
    } finally {
      setSending(false)
    }
  }

  if (loading && signups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">결제 오픈 알림 신청자</h2>
          <p className="text-sm text-gray-500 mt-1">
            홈페이지 결제/카드등록 단계 안내 배너에서 신청한 이메일 목록입니다. 정식 승인이 완료되어 실제 결제 모듈을 붙인 뒤, 아래 버튼으로 전원에게 오픈 안내 메일을 발송하세요.
          </p>
        </div>
        <Button onClick={handleSendAll} disabled={sending || pendingCount === 0}>
          <Send className="w-4 h-4 mr-2" />
          {sending ? '발송 중...' : `전원 발송 (${pendingCount}명 대상)`}
        </Button>
      </div>

      {sendResult && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {sendResult}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">전체 신청</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{signups.length}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-gray-500">발송 대기</div>
            <div className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}명</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {signups.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mail className="w-10 h-10 mx-auto mb-3" />
              아직 신청자가 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 font-medium">이메일</th>
                  <th className="py-2 font-medium">신청일</th>
                  <th className="py-2 font-medium">발송 상태</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 text-gray-900">{s.email}</td>
                    <td className="py-2.5 text-gray-500">{formatDateTime(s.created_at)}</td>
                    <td className="py-2.5">
                      {s.launch_email_sent_at ? (
                        <span className="text-green-600">발송 완료</span>
                      ) : (
                        <span className="text-amber-600">대기</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
