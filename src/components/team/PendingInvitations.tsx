// 대기중인 팀원 초대 목록을 보여주고 취소할 수 있게 하는 컴포넌트
// 지금까지 이 목록을 보거나 취소할 UI 자체가 없어(초대 생성 API만 호출됨),
// 좌석 제한이 있는 플랜에서 실수로 만든 초대 하나가 만료(48시간)될 때까지
// 좌석을 잠그고 있어도 관리자가 스스로 풀 방법이 없었다(51차 QA 확인)
'use client'

import { useState } from 'react'
import { useToast } from '@/components/shared/Toast'

interface PendingInvitation {
  id: string
  email: string | null
  role: string
  department: string | null
  invitation_code: string
  expires_at: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  user: '일반 사용자',
}

export default function PendingInvitations({
  invitations,
  canManage,
}: {
  invitations: PendingInvitation[]
  canManage: boolean
}) {
  const toast = useToast()
  const [items, setItems] = useState(invitations)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  if (items.length === 0) return null

  const handleCancel = async (id: string) => {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/users/invite?id=${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '초대 취소에 실패했습니다.')
      setItems((prev) => prev.filter((inv) => inv.id !== id))
      toast.success('초대가 취소되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '초대 취소에 실패했습니다.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          대기중인 초대 ({items.length}건)
        </h2>
        <ul className="divide-y divide-gray-200">
          {items.map((inv) => (
            <li key={inv.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {inv.email || '이메일 미지정'}
                </p>
                <p className="text-xs text-gray-500">
                  {ROLE_LABELS[inv.role] || inv.role}
                  {inv.department && ` · ${inv.department}`}
                  {' · '}
                  {new Date(inv.expires_at) < new Date()
                    ? '만료됨'
                    : `${new Date(inv.expires_at).toLocaleString('ko-KR')}까지 유효`}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleCancel(inv.id)}
                  disabled={cancellingId === inv.id}
                  className="flex-shrink-0 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {cancellingId === inv.id ? '취소 중...' : '초대 취소'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
